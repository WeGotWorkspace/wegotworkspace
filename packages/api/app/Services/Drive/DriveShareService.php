<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Exceptions\ApiHttpException;
use App\Models\DriveShare;
use App\Models\DriveShareGrant;
use App\Models\DriveShareSession;
use App\Services\Auth\JwtTokenService;
use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class DriveShareService
{
    private const GUEST_JWT_TTL_SECONDS = 3600;

    public function __construct(
        private StoragePaths $paths,
        private DriveSharePathScope $scope,
        private DriveGroupResolver $groups,
        private WgwStorage $storage,
        private JwtTokenService $jwtTokens,
        private DriveShareSessionRateLimiter $rateLimiter,
        private CollabDocFormats $collabDocFormats,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function listForOwner(string $username, ?string $path): array
    {
        $query = DriveShare::query()
            ->where('owner_username', strtolower($username))
            ->whereNull('revoked_at')
            ->orderByDesc('updated_at');

        if ($path !== null && trim($path) !== '') {
            $normalized = $this->scope->normalize($path);
            $query->where('path', $normalized);
        }

        /** @var Collection<int, DriveShare> $shares */
        $shares = $query->get();

        return $shares->map(fn (DriveShare $share): array => $this->serializeShareForOwner($share))->values()->all();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function createShare(string $username, array $input): array
    {
        $owner = strtolower(trim($username));
        $path = $this->requiredPath($input['path'] ?? null);
        $kind = $this->normalizeKind($input['kind'] ?? 'member');
        $defaultAccess = $this->normalizeAccess($input['defaultAccess'] ?? DriveShareAccess::VIEW);
        $expiresAt = $this->parseOptionalDate($input['expiresAt'] ?? null);
        $password = $this->normalizeNullableString($input['password'] ?? null);
        /** @var array<string, mixed>|null $shareWith */
        $shareWith = is_array($input['shareWith'] ?? null) ? $input['shareWith'] : null;

        $this->assertSharePathOwnedBy($owner, $path);
        $this->assertCommentReviewApplicable($path, $defaultAccess);

        $publicToken = $kind === 'public' ? $this->generatePublicToken() : null;

        return DB::connection('wgw')->transaction(function () use (
            $owner,
            $path,
            $kind,
            $defaultAccess,
            $expiresAt,
            $password,
            $publicToken,
            $shareWith
        ): array {
            $share = new DriveShare;
            $share->id = (string) Str::uuid();
            $share->path = $path;
            $share->owner_username = $owner;
            $share->kind = $kind;
            $share->default_access = $defaultAccess;
            $share->public_token = $publicToken;
            $share->password_hash = $password !== null ? Hash::make($password) : null;
            $share->expires_at = $expiresAt;
            $share->revoked_at = null;
            $share->save();

            if ($shareWith !== null) {
                $this->mergeShareWith($share, $shareWith);
            }

            $share->refresh();

            return $this->serializeShareForOwner($share);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function getShareForOwner(string $username, string $shareId): array
    {
        $share = $this->ownerShareOrFail($username, $shareId);

        return $this->serializeShareForOwner($share);
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function updateShare(string $username, string $shareId, array $input): array
    {
        return DB::connection('wgw')->transaction(function () use ($username, $shareId, $input): array {
            $share = $this->ownerShareOrFail($username, $shareId, lockForUpdate: true);
            $this->assertUpdatedAtMatches($share, $input['updatedAt'] ?? null);

            if (array_key_exists('defaultAccess', $input)) {
                $share->default_access = $this->normalizeAccess((string) $input['defaultAccess']);
                $this->assertCommentReviewApplicable($share->path, $share->default_access);
            }
            if (array_key_exists('expiresAt', $input)) {
                $share->expires_at = $this->parseOptionalDate($input['expiresAt']);
            }
            if (array_key_exists('password', $input)) {
                $password = $this->normalizeNullableString($input['password']);
                $share->password_hash = $password !== null ? Hash::make($password) : null;

                DriveShareSession::query()
                    ->where('share_id', $share->id)
                    ->whereNull('revoked_at')
                    ->update(['revoked_at' => Carbon::now()]);
            }
            $share->timestamps = false;
            $share->updated_at = $this->nextUpdatedAt($share);
            $share->save();
            $share->timestamps = true;

            if (is_array($input['shareWith'] ?? null)) {
                /** @var array<string, mixed> $shareWith */
                $shareWith = $input['shareWith'];
                $this->mergeShareWith($share, $shareWith);
            }

            $share->refresh();

            return $this->serializeShareForOwner($share);
        });
    }

    public function revokeShare(string $username, string $shareId): void
    {
        DB::connection('wgw')->transaction(function () use ($username, $shareId): void {
            $share = $this->ownerShareOrFail($username, $shareId, lockForUpdate: true);
            $now = Carbon::now();
            $share->revoked_at = $now;
            $share->save();

            DriveShareSession::query()
                ->where('share_id', $share->id)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => $now]);
        });
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function createInvite(string $username, string $shareId, array $input): array
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiHttpException(400, 'Valid email is required.', 'bad_request');
        }
        $access = $this->normalizeAccess((string) ($input['access'] ?? ''));

        return DB::connection('wgw')->transaction(function () use ($username, $shareId, $email, $access): array {
            $share = $this->ownerShareOrFail($username, $shareId, lockForUpdate: true);
            $this->assertCommentReviewApplicable($share->path, $access);

            $grant = new DriveShareGrant;
            $grant->id = (string) Str::uuid();
            $grant->share_id = (string) $share->id;
            $grant->grantee_type = 'email';
            $grant->grantee_email = $email;
            $grant->access = $access;
            $grant->status = 'pending';
            $grant->invite_token = bin2hex(random_bytes(16));
            $grant->save();

            return [
                'id' => (string) $grant->id,
                'email' => $email,
                'access' => $access,
                'inviteToken' => (string) $grant->invite_token,
            ];
        });
    }

    public function revokeInvite(string $username, string $shareId, string $inviteId): void
    {
        DB::connection('wgw')->transaction(function () use ($username, $shareId, $inviteId): void {
            $share = $this->ownerShareOrFail($username, $shareId, lockForUpdate: true);

            /** @var DriveShareGrant|null $grant */
            $grant = DriveShareGrant::query()
                ->where('id', $inviteId)
                ->where('share_id', $share->id)
                ->where('grantee_type', 'email')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if ($grant === null) {
                throw new ApiHttpException(404, 'Invite not found.', 'not_found');
            }

            $grant->status = 'revoked';
            $grant->save();
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function sharedWithMe(string $username): array
    {
        $user = strtolower(trim($username));

        /** @var Collection<int, DriveShareGrant> $grants */
        $grants = DriveShareGrant::query()
            ->with('share')
            ->where('grantee_type', 'user')
            ->where('grantee_user', $user)
            ->where('status', 'active')
            ->get();

        $now = Carbon::now();
        $rows = [];
        foreach ($grants as $grant) {
            $share = $grant->share;
            if ($share === null || $share->revoked_at !== null) {
                continue;
            }
            if ($share->expires_at !== null && $share->expires_at->lessThanOrEqualTo($now)) {
                continue;
            }
            $rows[] = [
                'share' => $this->serializeShareForMember($share, (string) $grant->access),
            ];
        }

        return $rows;
    }

    /**
     * @return array{
     *   access_token: string,
     *   token_type: string,
     *   expires_in: int,
     *   role: string,
     *   username: string,
     *   share: array<string, mixed>
     * }
     */
    public function createSessionFromPublicToken(string $token, ?string $password, string $ip): array
    {
        $token = strtolower(trim($token));
        if ($token === '') {
            throw new ApiHttpException(400, 'token is required.', 'bad_request');
        }
        if (! $this->rateLimiter->allow($ip, $token)) {
            throw new ApiHttpException(429, 'Too many attempts. Please try again later.', 'throttled');
        }

        $share = DriveShare::query()
            ->where('public_token', $token)
            ->whereNull('revoked_at')
            ->first();

        $failedAuth = $share === null || $share->kind !== 'public';
        if (! $failedAuth && $share->expires_at !== null && $share->expires_at->lessThanOrEqualTo(Carbon::now())) {
            $failedAuth = true;
        }
        if (! $failedAuth && $share->password_hash !== null) {
            $password = $password ?? '';
            if (! Hash::check($password, $share->password_hash)) {
                $failedAuth = true;
            }
        }

        if ($failedAuth || $share === null) {
            throw new ApiHttpException(401, 'Invalid share token or password.', 'unauthorized');
        }

        // v1 intentionally couples JWT TTL and DB session lifetime (both 1h) — no refresh flow yet.
        $now = Carbon::now();
        $sessionExpiresAt = $now->copy()->addSeconds(self::GUEST_JWT_TTL_SECONDS);
        if ($share->expires_at !== null && $share->expires_at->lessThan($sessionExpiresAt)) {
            $sessionExpiresAt = $share->expires_at->copy();
        }

        $session = new DriveShareSession;
        $session->id = (string) Str::uuid();
        $session->share_id = (string) $share->id;
        $session->session_key = bin2hex(random_bytes(16));
        $session->expires_at = $sessionExpiresAt;
        $session->revoked_at = null;
        $session->save();

        $exp = min($sessionExpiresAt->timestamp, $now->timestamp + self::GUEST_JWT_TTL_SECONDS);
        $sessionSubject = 'share:'.$session->session_key;
        $jwt = $this->jwtTokens->issue([
            'sub' => $sessionSubject,
            'role' => 'guest',
            'exp' => $exp,
        ]);

        return [
            'access_token' => $jwt,
            'token_type' => 'Bearer',
            'expires_in' => max(1, $exp - $now->timestamp),
            'role' => 'guest',
            'username' => $sessionSubject,
            'share' => [
                'id' => (string) $share->id,
                'path' => (string) $share->path,
                'defaultAccess' => (string) $share->default_access,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function acceptInvite(string $username, string $inviteToken): array
    {
        $inviteToken = trim($inviteToken);
        if ($inviteToken === '') {
            throw new ApiHttpException(400, 'inviteToken is required.', 'bad_request');
        }

        return DB::connection('wgw')->transaction(function () use ($username, $inviteToken): array {
            /** @var DriveShareGrant|null $grant */
            $grant = DriveShareGrant::query()
                ->with('share')
                ->where('invite_token', $inviteToken)
                ->where('grantee_type', 'email')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if ($grant === null || $grant->share === null || $grant->share->revoked_at !== null) {
                throw new ApiHttpException(404, 'Invite not found.', 'not_found');
            }

            $grant->grantee_type = 'user';
            $grant->grantee_user = strtolower($username);
            $grant->status = 'active';
            $grant->invite_token = null;
            $grant->save();

            return ['shareId' => (string) $grant->share_id, 'accepted' => true];
        });
    }

    private function requiredPath(mixed $value): string
    {
        if (! is_string($value) || trim($value) === '') {
            throw new ApiHttpException(400, 'path is required.', 'bad_request');
        }

        return $this->scope->normalize($value);
    }

    private function normalizeKind(mixed $value): string
    {
        $kind = strtolower(trim((string) $value));
        if (! in_array($kind, ['public', 'member', 'guest'], true)) {
            throw new ApiHttpException(400, 'Invalid kind.', 'bad_request');
        }

        return $kind;
    }

    private function normalizeAccess(string $access): string
    {
        $normalized = strtolower(trim($access));
        if (! DriveShareAccess::isValid($normalized)) {
            throw new ApiHttpException(400, 'Invalid access.', 'bad_request');
        }

        return $normalized;
    }

    private function parseOptionalDate(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (! is_string($value)) {
            throw new ApiHttpException(400, 'Invalid expiresAt.', 'bad_request');
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            throw new ApiHttpException(400, 'Invalid expiresAt.', 'bad_request');
        }
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (! is_string($value)) {
            throw new ApiHttpException(400, 'Invalid string value.', 'bad_request');
        }
        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function assertSharePathOwnedBy(string $username, string $path): void
    {
        $segments = explode('/', ltrim($path, '/'));
        $root = (string) ($segments[0] ?? '');
        if ($root === 'users' && strcasecmp((string) ($segments[1] ?? ''), $username) === 0) {
            return;
        }
        if ($root === 'groups') {
            $group = (string) ($segments[1] ?? '');
            if ($group !== '' && in_array($group, $this->groups->allowedGroupSlugs($username), true)) {
                return;
            }
        }

        throw new ApiHttpException(403, 'Cannot share this path.', 'forbidden');
    }

    private function assertCommentReviewApplicable(string $path, string $access): void
    {
        if (! in_array($access, [DriveShareAccess::COMMENT, DriveShareAccess::REVIEW], true)) {
            return;
        }

        $disk = $this->filesDisk();
        $key = $this->paths->virtualToStorageKey($path);
        if ($disk->fileExists($key) && ! $this->collabDocFormats->isCollabDocPath($path)) {
            $code = $access === DriveShareAccess::COMMENT ? 'comment_not_applicable' : 'review_not_applicable';
            throw new ApiHttpException(400, 'Access level is not applicable for this target.', $code);
        }
    }

    /**
     * @param  array<string, mixed>  $shareWith
     */
    private function mergeShareWith(DriveShare $share, array $shareWith): void
    {
        foreach ($shareWith as $principalId => $grantValue) {
            $principalId = trim((string) $principalId);
            if ($principalId === '') {
                throw new ApiHttpException(400, 'shareWith principal id must not be empty.', 'bad_request');
            }

            $isEmail = filter_var($principalId, FILTER_VALIDATE_EMAIL) !== false;
            $normalizedId = $isEmail ? strtolower($principalId) : strtolower($principalId);

            if ($grantValue === null) {
                if ($isEmail) {
                    DriveShareGrant::query()
                        ->where('share_id', $share->id)
                        ->where('grantee_type', 'email')
                        ->where('grantee_email', $normalizedId)
                        ->delete();
                } else {
                    DriveShareGrant::query()
                        ->where('share_id', $share->id)
                        ->where('grantee_type', 'user')
                        ->where('grantee_user', $normalizedId)
                        ->delete();
                }

                continue;
            }
            if (! is_array($grantValue)) {
                throw new ApiHttpException(400, 'shareWith grant must be an object or null.', 'bad_request');
            }
            $access = $this->normalizeAccess((string) ($grantValue['access'] ?? ''));
            $this->assertCommentReviewApplicable($share->path, $access);

            if ($isEmail) {
                $this->upsertEmailGrant($share, $normalizedId, $access);

                continue;
            }

            /** @var DriveShareGrant|null $grant */
            $grant = DriveShareGrant::query()
                ->where('share_id', $share->id)
                ->where('grantee_type', 'user')
                ->where('grantee_user', $normalizedId)
                ->first();

            if ($grant === null) {
                $grant = new DriveShareGrant;
                $grant->id = (string) Str::uuid();
                $grant->share_id = (string) $share->id;
                $grant->grantee_type = 'user';
                $grant->grantee_user = $normalizedId;
            }

            $grant->access = $access;
            $grant->status = 'active';
            $grant->save();
        }
    }

    private function upsertEmailGrant(DriveShare $share, string $email, string $access): void
    {
        /** @var DriveShareGrant|null $grant */
        $grant = DriveShareGrant::query()
            ->where('share_id', $share->id)
            ->where('grantee_type', 'email')
            ->where('grantee_email', $email)
            ->first();

        if ($grant === null) {
            $grant = new DriveShareGrant;
            $grant->id = (string) Str::uuid();
            $grant->share_id = (string) $share->id;
            $grant->grantee_type = 'email';
            $grant->grantee_email = $email;
            $grant->status = 'pending';
            $grant->invite_token = bin2hex(random_bytes(16));
        }

        $grant->access = $access;
        $grant->save();
    }

    private function assertUpdatedAtMatches(DriveShare $share, mixed $updatedAt): void
    {
        if (! is_string($updatedAt) || trim($updatedAt) === '') {
            throw new ApiHttpException(400, 'updatedAt is required.', 'bad_request');
        }
        try {
            $provided = Carbon::parse($updatedAt);
        } catch (\Throwable) {
            throw new ApiHttpException(400, 'Invalid updatedAt.', 'bad_request');
        }
        $current = $share->updated_at;
        if (! $current instanceof Carbon) {
            throw new ApiHttpException(409, 'Share update conflict.', 'share_conflict');
        }
        if (! $current->equalTo($provided)) {
            throw new ApiHttpException(409, 'Share update conflict.', 'share_conflict');
        }
    }

    private function nextUpdatedAt(DriveShare $share): Carbon
    {
        $now = Carbon::now();
        $current = $share->updated_at;
        if ($current instanceof Carbon && $now->timestamp <= $current->timestamp) {
            $now = $current->copy()->addSecond();
        }

        return $now;
    }

    private function ownerShareOrFail(string $username, string $shareId, bool $lockForUpdate = false): DriveShare
    {
        $query = DriveShare::query()
            ->where('id', $shareId)
            ->where('owner_username', strtolower($username))
            ->whereNull('revoked_at');

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        /** @var DriveShare|null $share */
        $share = $query->first();
        if ($share === null) {
            throw new ApiHttpException(404, 'Share not found.', 'not_found');
        }

        return $share;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeShareForOwner(DriveShare $share): array
    {
        $shareWith = [];
        /** @var Collection<int, DriveShareGrant> $grants */
        $grants = DriveShareGrant::query()
            ->where('share_id', $share->id)
            ->where('grantee_type', 'user')
            ->where('status', 'active')
            ->get();

        foreach ($grants as $grant) {
            if ($grant->grantee_user === null || $grant->grantee_user === '') {
                continue;
            }
            $shareWith[$grant->grantee_user] = ['access' => (string) $grant->access];
        }

        return [
            'id' => (string) $share->id,
            'path' => (string) $share->path,
            'kind' => (string) $share->kind,
            'defaultAccess' => (string) $share->default_access,
            'publicToken' => $share->public_token,
            'hasPassword' => $share->password_hash !== null && $share->password_hash !== '',
            'expiresAt' => $share->expires_at?->toISOString(),
            'updatedAt' => $share->updated_at?->toISOString(),
            'shareWith' => $shareWith === [] ? null : $shareWith,
            'myRights' => DriveShareAccess::rightsFor(DriveShareAccess::FULL, true, true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeShareForMember(DriveShare $share, string $grantAccess): array
    {
        $isCollabDoc = $this->collabDocFormats->isCollabDocPath((string) $share->path);

        return [
            'id' => (string) $share->id,
            'path' => (string) $share->path,
            'kind' => (string) $share->kind,
            'defaultAccess' => (string) $grantAccess,
            'publicToken' => null,
            'hasPassword' => $share->password_hash !== null && $share->password_hash !== '',
            'expiresAt' => $share->expires_at?->toISOString(),
            'updatedAt' => $share->updated_at?->toISOString(),
            'shareWith' => null,
            'myRights' => DriveShareAccess::rightsFor($grantAccess, $isCollabDoc, false),
        ];
    }

    private function generatePublicToken(): string
    {
        return strtolower(bin2hex(random_bytes(16)));
    }

    private function filesDisk(): Filesystem
    {
        return $this->storage->files();
    }
}

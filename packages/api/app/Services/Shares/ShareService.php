<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Models\FileShare;
use App\Models\FileShareGrant;
use App\Services\Drive\DriveGroupResolver;
use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Owner-side share management: create/list/update/revoke shares and manage the
 * email grants attached to them. Ownership of the target path is enforced via
 * {@see StoragePaths::isPathAllowed()} exactly like the drive does.
 */
final class ShareService
{
    public function __construct(
        private WgwStorage $storage,
        private StoragePaths $paths,
        private DriveGroupResolver $groups,
        private ShareTokenFactory $tokens,
        private ShareAvailability $availability,
        private ShareLinkBuilder $links,
        private ShareInviteSender $invites,
    ) {}

    public function assertPublicSharesEnabled(): void
    {
        $this->availability->assertEnabled();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listShares(string $username, ?string $path = null): array
    {
        $this->assertPublicSharesEnabled();

        $query = FileShare::query()
            ->with('grants')
            ->where('owner_username', $username)
            ->orderByDesc('created_at');

        if ($path !== null && trim($path) !== '') {
            $query->where('target_path', $this->paths->normalizeVirtualPath($path));
        }

        return $query->get()
            ->map(fn (FileShare $share): array => $this->serializeShare($share))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function createShare(
        string $username,
        string $path,
        string $publicAccess,
        ?string $expiresAt,
    ): array {
        $this->assertPublicSharesEnabled();
        $publicAccess = $this->validatePublicAccess($publicAccess);
        $path = $this->paths->normalizeVirtualPath($path);

        if ($this->paths->isNotePath($path)) {
            throw new \InvalidArgumentException('This path cannot be shared.');
        }

        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        if (! $this->paths->isPathAllowed($path, $username, $groupSlugs, true)) {
            throw new \InvalidArgumentException('Access denied for this path.');
        }

        $targetType = $this->resolveTargetType($path);

        $share = new FileShare([
            'id' => (string) Str::ulid(),
            'token' => $this->uniqueToken(),
            'owner_username' => $username,
            'target_path' => $path,
            'target_type' => $targetType,
            'public_access' => $publicAccess,
            'expires_at' => $this->resolveExpiry($expiresAt, useDefault: true),
        ]);
        $share->save();

        return $this->serializeShare($share->fresh('grants') ?? $share);
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public function updateShare(string $username, string $shareId, array $changes): array
    {
        $this->assertPublicSharesEnabled();
        $share = $this->ownedShare($username, $shareId);

        if (array_key_exists('publicAccess', $changes)) {
            $share->public_access = $this->validatePublicAccess((string) $changes['publicAccess']);
        }
        if (array_key_exists('expiresAt', $changes)) {
            $raw = $changes['expiresAt'];
            $share->expires_at = $raw === null || $raw === ''
                ? null
                : $this->resolveExpiry((string) $raw, useDefault: false);
        }
        $share->save();

        return $this->serializeShare($share->fresh('grants') ?? $share);
    }

    public function revokeShare(string $username, string $shareId): void
    {
        $this->assertPublicSharesEnabled();
        $share = $this->ownedShare($username, $shareId);
        $share->grants()->delete();
        $share->delete();
    }

    /**
     * @param  list<string>  $emails
     * @return array<string, mixed>
     */
    public function addGrants(string $username, string $shareId, array $emails, string $permission): array
    {
        $this->assertPublicSharesEnabled();
        $share = $this->ownedShare($username, $shareId);
        $permission = $this->validatePermission($permission);

        foreach ($emails as $rawEmail) {
            $email = strtolower(trim((string) $rawEmail));
            if ($email === '') {
                continue;
            }

            $grant = FileShareGrant::query()
                ->where('share_id', $share->id)
                ->where('email', $email)
                ->first();

            if ($grant !== null && $grant->isConfirmed()) {
                // Already confirmed: keep their access, only adjust permission.
                $grant->permission = $permission;
                $grant->save();

                continue;
            }

            $inviteToken = $this->uniqueInviteToken();
            if ($grant === null) {
                $grant = new FileShareGrant([
                    'id' => (string) Str::ulid(),
                    'share_id' => (string) $share->id,
                    'email' => $email,
                ]);
            }
            $grant->permission = $permission;
            $grant->status = FileShareGrant::STATUS_PENDING;
            $grant->invite_token = $inviteToken;
            $grant->access_token = null;
            $grant->confirmed_at = null;
            $grant->save();

            $this->invites->send($share, $grant);
        }

        return $this->serializeShare($share->fresh('grants') ?? $share);
    }

    /**
     * @return array<string, mixed>
     */
    public function revokeGrant(string $username, string $shareId, string $grantId): array
    {
        $this->assertPublicSharesEnabled();
        $share = $this->ownedShare($username, $shareId);

        $grant = FileShareGrant::query()
            ->where('share_id', $share->id)
            ->where('id', $grantId)
            ->first();
        if ($grant === null) {
            throw new \RuntimeException('Grant not found.');
        }

        $grant->status = FileShareGrant::STATUS_REVOKED;
        $grant->access_token = null;
        $grant->save();

        return $this->serializeShare($share->fresh('grants') ?? $share);
    }

    public function shareLinkUrl(string $token): string
    {
        return $this->links->shareLinkUrl($token);
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeShare(FileShare $share): array
    {
        $grants = $share->relationLoaded('grants')
            ? $share->getRelation('grants')
            : $share->grants()->get();

        return [
            'id' => (string) $share->id,
            'token' => (string) $share->token,
            'path' => (string) $share->target_path,
            'name' => basename((string) $share->target_path),
            'targetType' => (string) $share->target_type,
            'publicAccess' => (string) $share->public_access,
            'expiresAt' => $share->expires_at?->toIso8601String(),
            'url' => $this->shareLinkUrl((string) $share->token),
            'createdAt' => $share->created_at?->toIso8601String(),
            'grants' => array_values(array_map(
                static fn (FileShareGrant $grant): array => [
                    'id' => (string) $grant->id,
                    'email' => (string) $grant->email,
                    'permission' => (string) $grant->permission,
                    'status' => (string) $grant->status,
                    'confirmedAt' => $grant->confirmed_at?->toIso8601String(),
                ],
                $grants->all(),
            )),
        ];
    }

    private function ownedShare(string $username, string $shareId): FileShare
    {
        $share = FileShare::query()
            ->where('id', $shareId)
            ->where('owner_username', $username)
            ->first();
        if ($share === null) {
            throw new \RuntimeException('Share not found.');
        }

        return $share;
    }

    private function resolveTargetType(string $path): string
    {
        $disk = $this->storage->files();
        $key = $this->paths->virtualToStorageKey($path);
        if ($key !== '' && $disk->directoryExists($key)) {
            return FileShare::TYPE_DIR;
        }
        if ($key !== '' && $disk->fileExists($key)) {
            return FileShare::TYPE_FILE;
        }

        throw new \RuntimeException('Target not found.');
    }

    private function validatePublicAccess(string $value): string
    {
        $value = strtolower(trim($value));
        if (! in_array($value, [FileShare::PUBLIC_NONE, FileShare::PUBLIC_READ, FileShare::PUBLIC_WRITE], true)) {
            throw new \InvalidArgumentException('Invalid public access level.');
        }

        return $value;
    }

    private function validatePermission(string $value): string
    {
        $value = strtolower(trim($value));
        if (! in_array($value, [FileShareGrant::PERMISSION_READ, FileShareGrant::PERMISSION_WRITE], true)) {
            throw new \InvalidArgumentException('Invalid permission.');
        }

        return $value;
    }

    private function resolveExpiry(?string $expiresAt, bool $useDefault): ?Carbon
    {
        if ($expiresAt !== null && trim($expiresAt) !== '') {
            try {
                $parsed = Carbon::parse($expiresAt);
            } catch (\Throwable) {
                throw new \InvalidArgumentException('Invalid expiry date.');
            }

            return $parsed;
        }

        if ($useDefault) {
            $days = config('wgw.shares.default_expiry_days');
            if ($days !== null) {
                return Carbon::now()->addDays((int) $days);
            }
        }

        return null;
    }

    private function uniqueToken(): string
    {
        do {
            $token = $this->tokens->generate();
        } while (FileShare::query()->where('token', $token)->exists());

        return $token;
    }

    private function uniqueInviteToken(): string
    {
        do {
            $token = $this->tokens->generate();
        } while (FileShareGrant::query()->where('invite_token', $token)->exists());

        return $token;
    }
}

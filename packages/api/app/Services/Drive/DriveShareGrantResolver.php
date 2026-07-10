<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Models\DriveShareGrant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

final class DriveShareGrantResolver
{
    public function __construct(private DriveSharePathScope $scope) {}

    /**
     * @param  list<array{
     *   shareId: string,
     *   rootPath: string,
     *   access: string,
     *   kind: string,
     *   ownerUsername: string,
     *   grantKind: string
     * }>  $candidates
     * @return array{
     *   shareId: string,
     *   rootPath: string,
     *   access: string,
     *   kind: string,
     *   ownerUsername: string,
     *   grantKind: string
     * }|null
     */
    public function resolveWinningGrant(array $candidates): ?array
    {
        $winner = null;
        foreach ($candidates as $candidate) {
            if ($winner === null) {
                $winner = $candidate;

                continue;
            }

            $currentLength = strlen($winner['rootPath']);
            $candidateLength = strlen($candidate['rootPath']);
            if ($candidateLength > $currentLength) {
                $winner = $candidate;

                continue;
            }
            if ($candidateLength < $currentLength) {
                continue;
            }

            $winnerKind = $winner['grantKind'];
            $candidateKind = $candidate['grantKind'];
            if ($winnerKind === 'group' && $candidateKind === 'user') {
                $winner = $candidate;

                continue;
            }
            if ($winnerKind === 'user' && $candidateKind === 'group') {
                continue;
            }

            $winner['access'] = DriveShareAccess::leastPermissive($winner['access'], $candidate['access']);
        }

        return $winner;
    }

    /**
     * @param  list<string>|null  $groupSlugs
     * @return array{
     *   shareId: string,
     *   rootPath: string,
     *   access: string,
     *   kind: string,
     *   ownerUsername: string,
     *   grantKind: string
     * }|null
     */
    public function resolveMemberGrant(string $username, string $virtualPath, ?array $groupSlugs = null): ?array
    {
        $requestedPath = $this->scope->normalize($virtualPath);
        $now = Carbon::now();
        $user = strtolower(trim($username));
        $groupSlugs = $groupSlugs ?? [];

        /** @var Collection<int, DriveShareGrant> $userGrants */
        $userGrants = DriveShareGrant::query()
            ->with('share')
            ->where('grantee_type', 'user')
            ->where('grantee_user', $user)
            ->where('status', 'active')
            ->get();

        $candidates = [];
        foreach ($userGrants as $grant) {
            $candidate = $this->candidateFromGrant($grant, $requestedPath, $now, 'user');
            if ($candidate !== null) {
                $candidates[] = $candidate;
            }
        }

        if ($groupSlugs !== []) {
            /** @var Collection<int, DriveShareGrant> $groupGrants */
            $groupGrants = DriveShareGrant::query()
                ->with('share')
                ->where('grantee_type', 'group')
                ->whereIn('grantee_group', $groupSlugs)
                ->where('status', 'active')
                ->get();

            foreach ($groupGrants as $grant) {
                $candidate = $this->candidateFromGrant($grant, $requestedPath, $now, 'group');
                if ($candidate !== null) {
                    $candidates[] = $candidate;
                }
            }
        }

        return $this->resolveWinningGrant($candidates);
    }

    /**
     * @return array{
     *   shareId: string,
     *   rootPath: string,
     *   access: string,
     *   kind: string,
     *   ownerUsername: string,
     *   grantKind: string
     * }|null
     */
    private function candidateFromGrant(
        DriveShareGrant $grant,
        string $requestedPath,
        Carbon $now,
        string $grantKind,
    ): ?array {
        $share = $grant->share;
        if ($share === null || $share->revoked_at !== null) {
            return null;
        }
        if ($share->expires_at !== null && $share->expires_at->lessThanOrEqualTo($now)) {
            return null;
        }
        $sharePath = $this->scope->normalize($share->path);
        if (! $this->scope->isWithin($sharePath, $requestedPath)) {
            return null;
        }

        return [
            'shareId' => (string) $share->id,
            'rootPath' => $sharePath,
            'access' => (string) $grant->access,
            'kind' => (string) $share->kind,
            'ownerUsername' => (string) $share->owner_username,
            'grantKind' => $grantKind,
        ];
    }
}

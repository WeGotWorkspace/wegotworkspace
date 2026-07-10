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
     * @return array{
     *   shareId: string,
     *   rootPath: string,
     *   access: string,
     *   kind: string,
     *   ownerUsername: string
     * }|null
     */
    public function resolveMemberGrant(string $username, string $virtualPath): ?array
    {
        $requestedPath = $this->scope->normalize($virtualPath);
        $now = Carbon::now();

        /** @var Collection<int, DriveShareGrant> $grants */
        $grants = DriveShareGrant::query()
            ->with('share')
            ->where('grantee_type', 'user')
            ->where('grantee_user', strtolower($username))
            ->where('status', 'active')
            ->get();

        $winner = null;
        foreach ($grants as $grant) {
            $share = $grant->share;
            if ($share === null || $share->revoked_at !== null) {
                continue;
            }
            if ($share->expires_at !== null && $share->expires_at->lessThanOrEqualTo($now)) {
                continue;
            }
            $sharePath = $this->scope->normalize($share->path);
            if (! $this->scope->isWithin($sharePath, $requestedPath)) {
                continue;
            }

            $candidate = [
                'shareId' => (string) $share->id,
                'rootPath' => $sharePath,
                'access' => (string) $grant->access,
                'kind' => (string) $share->kind,
                'ownerUsername' => (string) $share->owner_username,
            ];

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
            if ($candidateLength === $currentLength) {
                $winner['access'] = DriveShareAccess::leastPermissive($winner['access'], $candidate['access']);
            }
        }

        return $winner;
    }
}

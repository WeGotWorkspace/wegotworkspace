<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Models\FileShare;
use App\Models\FileShareGrant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Recipient-side grant flow: a visitor self-requests access by email (creating a
 * pending grant + confirmation email), then confirms via the emailed invite
 * token to receive a long-lived access token presented in `X-Wgw-Share-Access`.
 */
final class ShareGrantService
{
    public function __construct(
        private ShareAccessResolver $resolver,
        private ShareTokenFactory $tokens,
        private ShareAvailability $availability,
        private ShareInviteSender $invites,
    ) {}

    /**
     * Visitor requests access to a share by email. Idempotent per email: an
     * already-confirmed grant is left untouched; otherwise a fresh pending
     * invite is (re)issued and emailed.
     *
     * @return array{status: string}
     */
    public function requestAccess(string $token, string $email): array
    {
        $this->availability->assertEnabled();
        $share = $this->resolver->findActiveShare($token);
        if ($share === null) {
            throw new \RuntimeException('Share not found.');
        }

        $email = strtolower(trim($email));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('A valid email address is required.');
        }

        $grant = FileShareGrant::query()
            ->where('share_id', $share->id)
            ->where('email', $email)
            ->first();

        if ($grant !== null && $grant->isConfirmed()) {
            return ['status' => FileShareGrant::STATUS_CONFIRMED];
        }

        if ($grant === null) {
            $grant = new FileShareGrant([
                'id' => (string) Str::ulid(),
                'share_id' => (string) $share->id,
                'email' => $email,
                'permission' => FileShareGrant::PERMISSION_READ,
            ]);
        }
        $grant->status = FileShareGrant::STATUS_PENDING;
        $grant->invite_token = $this->uniqueInviteToken();
        $grant->access_token = null;
        $grant->confirmed_at = null;
        $grant->save();

        $this->invites->send($share, $grant);

        return ['status' => FileShareGrant::STATUS_PENDING];
    }

    /**
     * Confirm a pending grant by its emailed invite token, minting the access
     * token the recipient presents on subsequent requests.
     *
     * @return array{accessToken: string, token: string, permission: string}
     */
    public function confirm(string $inviteToken): array
    {
        $this->availability->assertEnabled();
        $inviteToken = trim($inviteToken);
        if ($inviteToken === '') {
            throw new \InvalidArgumentException('Invite token is required.');
        }

        $grant = FileShareGrant::query()->where('invite_token', $inviteToken)->first();
        if ($grant === null || $grant->status === FileShareGrant::STATUS_REVOKED) {
            throw new \RuntimeException('Invite not found.');
        }

        $share = $this->resolver->findActiveShare(
            (string) (FileShare::query()->whereKey($grant->share_id)->value('token') ?? '')
        );
        if ($share === null) {
            throw new \RuntimeException('Share not found.');
        }

        if (! $grant->isConfirmed() || $grant->access_token === null) {
            $grant->status = FileShareGrant::STATUS_CONFIRMED;
            $grant->access_token = $this->uniqueAccessToken();
            $grant->confirmed_at = Carbon::now();
            $grant->save();
        }

        return [
            'accessToken' => (string) $grant->access_token,
            'token' => (string) $share->token,
            'permission' => (string) $grant->permission,
        ];
    }

    private function uniqueInviteToken(): string
    {
        do {
            $token = $this->tokens->generate();
        } while (FileShareGrant::query()->where('invite_token', $token)->exists());

        return $token;
    }

    private function uniqueAccessToken(): string
    {
        do {
            $token = $this->tokens->generate();
        } while (FileShareGrant::query()->where('access_token', $token)->exists());

        return $token;
    }
}

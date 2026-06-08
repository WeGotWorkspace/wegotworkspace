<?php

declare(strict_types=1);

namespace Tests\Feature\Mail;

use App\Services\Settings\SettingKeys;
use Tests\Support\WgwDatabaseTestCase;

final class MailEndpointsTest extends WgwDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';
        $this->configureWgwJwtKeys();

        $this->seedWgwUser('alice', displayName: 'Alice');
    }

    public function test_mail_status_without_server_or_account_config(): void
    {
        $token = $this->issueBearerTokenFor('alice');

        $response = $this->withBearer($token)->getJson('/api/v1/mail/status');

        $response->assertOk();
        $response->assertJsonStructure([
            'extImap',
            'serversConfigured',
            'accountConfigured',
            'configured',
            'ready',
        ]);
        $this->assertFalse($response->json('serversConfigured'));
        $this->assertFalse($response->json('accountConfigured'));
        $this->assertFalse($response->json('ready'));
    }

    public function test_mail_folders_returns_not_configured_without_credentials(): void
    {
        $this->seedMailServers();
        $token = $this->issueBearerTokenFor('alice');

        $response = $this->withBearer($token)->getJson('/api/v1/mail/folders');

        $response->assertStatus(400);
        $response->assertJson(['error' => 'not_configured']);
    }

    public function test_mail_messages_requires_folder(): void
    {
        $token = $this->issueBearerTokenFor('alice');

        $response = $this->withBearer($token)->getJson('/api/v1/mail/messages');

        $response->assertStatus(400);
        $response->assertJson(['error' => 'mailbox_required']);
    }

    public function test_mail_message_delete_requires_folder_and_uid(): void
    {
        $token = $this->issueBearerTokenFor('alice');

        $this->withBearer($token)->deleteJson('/api/v1/mail/messages/incomplete-id')
            ->assertStatus(400)
            ->assertJson(['error' => 'bad_params']);
    }

    public function test_mail_move_is_routed_and_validates_params(): void
    {
        $token = $this->issueBearerTokenFor('alice');

        $this->withBearer($token)->postJson('/api/v1/mail/move', [
            'fromFolder' => 'SU5CT1g',
            'toFolder' => 'SU5CT1guQXJjaGl2ZQ',
            'uid' => 1,
        ])
            ->assertStatus(400)
            ->assertJson(['error' => 'not_configured']);
    }

    private function seedMailServers(): void
    {
        $this->setAppSettings([
            SettingKeys::MAIL_IMAP_HOST => 'imap.example.test',
            SettingKeys::MAIL_IMAP_PORT => 993,
            SettingKeys::MAIL_IMAP_SECURITY => 'ssl',
            SettingKeys::MAIL_SMTP_HOST => 'smtp.example.test',
            SettingKeys::MAIL_SMTP_PORT => 465,
            SettingKeys::MAIL_SMTP_SECURITY => 'ssl',
        ]);
    }
}

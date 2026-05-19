<?php

declare(strict_types=1);

namespace Tests\Feature\Mail;

use App\Models\AppSetting;
use App\Models\Principal;
use App\Models\User;
use App\Settings\SettingKeys;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class MailEndpointsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        \Illuminate\Support\Facades\DB::purge('wgw');

        $keys = AuthTestKeys::rsaPair();
        config([
            'wgw.jwt.private_key' => $keys['private_key'],
            'wgw.jwt.public_key' => $keys['public_key'],
            'wgw.jwt.issuer' => $keys['issuer'],
            'wgw.jwt.audience' => $keys['audience'],
            'wgw.jwt.kid' => $keys['kid'],
        ]);

        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applyAuthTables();
        SqliteWgwSchema::applyMailTables();

        User::query()->insert([
            'id' => 1,
            'username' => 'alice',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->insert([
            'id' => 1,
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
    }

    public function test_mail_status_without_server_or_account_config(): void
    {
        $token = $this->tokenForAlice();

        $response = $this->getJson('/api/v1/mail/status', [
            'Authorization' => 'Bearer '.$token,
        ]);

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
        $token = $this->tokenForAlice();

        $response = $this->getJson('/api/v1/mail/folders', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertStatus(400);
        $response->assertJson(['error' => 'not_configured']);
    }

    public function test_mail_messages_requires_folder(): void
    {
        $token = $this->tokenForAlice();

        $response = $this->getJson('/api/v1/mail/messages', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertStatus(400);
        $response->assertJson(['error' => 'mailbox_required']);
    }

    public function test_mail_message_delete_requires_folder_and_uid(): void
    {
        $token = $this->tokenForAlice();

        $this->deleteJson('/api/v1/mail/message', [], [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertStatus(400)
            ->assertJson(['error' => 'bad_params']);
    }

    private function seedMailServers(): void
    {
        AppSetting::setValue(SettingKeys::MAIL_IMAP_HOST, 'imap.example.test');
        AppSetting::setValue(SettingKeys::MAIL_IMAP_PORT, 993);
        AppSetting::setValue(SettingKeys::MAIL_IMAP_SECURITY, 'ssl');
        AppSetting::setValue(SettingKeys::MAIL_SMTP_HOST, 'smtp.example.test');
        AppSetting::setValue(SettingKeys::MAIL_SMTP_PORT, 465);
        AppSetting::setValue(SettingKeys::MAIL_SMTP_SECURITY, 'ssl');
    }

    private function tokenForAlice(): string
    {
        $response = $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ]);
        $response->assertOk();

        return (string) $response->json('access_token');
    }
}

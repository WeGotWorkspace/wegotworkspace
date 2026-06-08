<?php

declare(strict_types=1);

namespace Tests\Feature\Settings;

use App\Models\AppSetting;
use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;
use App\Support\WgwSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\WgwDatabaseTestCase;

final class SettingsEndpointsTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $this->dataDir = storage_path('framework/testing/wgw-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/drive');
        config(['wgw.data_dir' => $this->dataDir]);
        $this->configureWgwJwtKeys();
        $this->seedAlice();
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }
        parent::tearDown();
    }

    public function test_settings_state_requires_auth(): void
    {
        $this->getJson('/api/v1/settings/state')->assertUnauthorized();
    }

    public function test_settings_state_profile_and_mail(): void
    {
        $token = $this->issueBearerToken();

        $state = $this->getJson('/api/v1/settings/state', [
            'Authorization' => 'Bearer '.$token,
        ]);
        $state->assertOk();
        $state->assertJsonPath('user.username', 'alice');
        $state->assertJsonPath('mail.imapHasPassword', false);

        $profile = $this->putJson('/api/v1/settings/profile', [
            'displayName' => 'Alice Updated',
            'email' => 'alice.updated@example.test',
        ], [
            'Authorization' => 'Bearer '.$token,
        ]);
        $profile->assertOk();
        $profile->assertJsonPath('user.displayName', 'Alice Updated');
        $profile->assertJsonPath('user.email', 'alice.updated@example.test');

        $mail = $this->putJson('/api/v1/settings/mail', [
            'imapUsername' => 'ignored@imap.example.test',
            'imapPassword' => 'mail-secret',
        ], [
            'Authorization' => 'Bearer '.$token,
        ]);
        $mail->assertOk();
        $mail->assertJsonPath('mail.imapUsername', 'ignored@imap.example.test');
        $mail->assertJsonPath('mail.imapHasPassword', true);
        $mail->assertJsonPath('mailServer.imapPort', 993);
    }

    public function test_settings_mail_accepts_post_with_method_override(): void
    {
        $token = $this->issueBearerToken();

        $this->postJson('/api/v1/settings/mail', [
            'imapUsername' => 'tunnel@imap.example.test',
            'imapPassword' => 'mail-secret',
        ], [
            'Authorization' => 'Bearer '.$token,
            'X-HTTP-Method-Override' => 'PUT',
        ])
            ->assertOk()
            ->assertJsonPath('mail.imapUsername', 'tunnel@imap.example.test')
            ->assertJsonPath('mail.imapHasPassword', true);
    }

    public function test_settings_mail_save_persists_password_and_syncs_profile_email(): void
    {
        $token = $this->issueBearerToken();

        $this->putJson('/api/v1/settings/mail', [
            'imapUsername' => 'alice@imap.example.test',
            'imapPassword' => 'mail-secret',
        ], [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'alice@imap.example.test')
            ->assertJsonPath('mail.imapUsername', 'alice@imap.example.test')
            ->assertJsonPath('mail.imapHasPassword', true);

        $this->getJson('/api/v1/settings/state', ['Authorization' => 'Bearer '.$token])
            ->assertOk()
            ->assertJsonPath('mail.imapHasPassword', true);
    }

    public function test_settings_state_includes_group_membership(): void
    {
        $group = Principal::query()->create([
            'uri' => AdminRoleResolver::ADMIN_GROUP_URI,
            'displayname' => 'Administrators',
        ]);
        $support = Principal::query()->create([
            'uri' => 'principals/groups/support',
            'displayname' => 'Support',
        ]);
        $alice = Principal::query()->where('uri', 'principals/alice')->first();
        $this->assertNotNull($alice);
        DB::connection('wgw')->table('groupmembers')->insert([
            ['principal_id' => $support->id, 'member_id' => $alice->id],
        ]);

        $token = $this->issueBearerToken();
        $state = $this->getJson('/api/v1/settings/state', [
            'Authorization' => 'Bearer '.$token,
        ]);
        $state->assertOk();
        $ids = array_column($state->json('groups'), 'id');
        $this->assertContains('principals/groups/support', $ids);
    }

    private function seedAlice(): void
    {
        AppSetting::setValue('auth_realm', 'SabreDAV');
        AppSetting::setValue(WgwSettings::MAIL_IMAP_HOST, 'imap.example.test');
        AppSetting::setValue(WgwSettings::MAIL_IMAP_PORT, 993);
        User::query()->create([
            'username' => 'alice',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'old@example.test',
            'displayname' => 'Old Name',
        ]);
    }
}

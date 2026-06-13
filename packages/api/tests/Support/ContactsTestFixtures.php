<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;
use App\Support\WgwSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Sabre\CardDAV\Backend\PDO as CardPDO;

/**
 * Shared CardDAV PDO fixtures for Contacts REST feature tests.
 */
trait ContactsTestFixtures
{
    use WgwRoleFixtures;

    protected function setUpContactsFixtures(): void
    {
        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->configureWgwJwtKeys();
        config(['wgw.auth_realm' => 'SabreDAV']);
        $this->setAppSetting('auth_realm', 'SabreDAV');
        $this->setAppSetting(WgwSettings::CONTACTS_ENABLED, true);
        $this->seedContactsRoleMatrix();
    }

    protected function seedContactsRoleMatrix(): void
    {
        if (User::query()->where('username', 'bob')->exists()) {
            return;
        }

        $this->seedWgwUser('bob', displayName: 'Bob');
        $this->seedWgwUser('alice', displayName: 'Alice');
        $this->seedWgwUser('carol', displayName: 'Carol');

        $alice = Principal::forUsername('alice');
        $this->assertNotNull($alice);
        $adminGroup = $this->seedWgwGroup(AdminRoleResolver::ADMIN_GROUP_URI, 'Administrators');
        $this->addPrincipalToGroup($adminGroup, $alice);

        $this->seedDefaultAddressBookFor('bob');
        $this->seedDefaultAddressBookFor('carol');
    }

    protected function carolBearerToken(): string
    {
        return $this->issueBearerTokenFor('carol');
    }

    protected function seedDefaultAddressBookFor(string $username): void
    {
        $carddav = new CardPDO(DB::connection('wgw')->getPdo());
        $principalUri = 'principals/'.$username;

        foreach ($carddav->getAddressBooksForUser($principalUri) as $book) {
            if (($book['uri'] ?? '') === 'default') {
                return;
            }
        }

        $carddav->createAddressBook($principalUri, 'default', [
            '{DAV:}displayname' => 'Address book',
        ]);
    }

    protected function seedCardViaPdo(
        string $username,
        string $cardUri,
        string $vcard,
        string $bookUri = 'default',
    ): string {
        $carddav = new CardPDO(DB::connection('wgw')->getPdo());
        $bookId = $this->resolveAddressBookId($username, $bookUri);
        $carddav->createCard($bookId, $cardUri, $vcard);

        return str_ends_with($cardUri, '.vcf')
            ? substr($cardUri, 0, -4)
            : $cardUri;
    }

    protected function updateCardViaPdo(
        string $username,
        string $cardUri,
        string $vcard,
        string $bookUri = 'default',
    ): void {
        $carddav = new CardPDO(DB::connection('wgw')->getPdo());
        $bookId = $this->resolveAddressBookId($username, $bookUri);
        $cardUri = str_ends_with($cardUri, '.vcf') ? $cardUri : $cardUri.'.vcf';
        $carddav->updateCard($bookId, $cardUri, $vcard);
    }

    protected function sampleVcard(string $fullName = 'Jane Doe', ?string $uid = null): string
    {
        $uid ??= 'urn:uuid:'.Str::uuid()->toString();

        return "BEGIN:VCARD\r\nVERSION:4.0\r\nUID:{$uid}\r\nFN:{$fullName}\r\nN:Doe;Jane;;;\r\nEMAIL:jane@example.com\r\nEND:VCARD\r\n";
    }

    /**
     * @return array<string, mixed>
     */
    protected function sampleContactCardPayload(string $bookId = 'default'): array
    {
        return [
            '@type' => 'Card',
            'version' => '1.0',
            'uid' => 'urn:uuid:'.Str::uuid()->toString(),
            'addressBookIds' => [$bookId => true],
            'name' => [
                'full' => 'New Contact',
            ],
            'emails' => [
                'email-1' => [
                    'email' => 'new@example.com',
                ],
            ],
        ];
    }

    private function resolveAddressBookId(string $username, string $bookUri): int
    {
        $carddav = new CardPDO(DB::connection('wgw')->getPdo());
        foreach ($carddav->getAddressBooksForUser('principals/'.$username) as $book) {
            if (($book['uri'] ?? '') === $bookUri) {
                return (int) $book['id'];
            }
        }

        throw new \RuntimeException("Address book {$bookUri} not found for {$username}.");
    }
}

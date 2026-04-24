<?php

declare(strict_types=1);

namespace App\Server;

use App\Config;
use App\Paths;
use Psr\Log\NullLogger;
use Sabre\CalDAV;
use Sabre\CardDAV;
use Sabre\DAV;
use Sabre\DAV\Locks;
use Sabre\DAVACL;

final class SabreApp
{
    public static function run(): void
    {
        $cfg = Config::load();
        $tz = $cfg['timezone'] ?? 'UTC';
        date_default_timezone_set($tz);

        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'],
            $pdoCfg['password'],
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );

        $cal = $cfg['calendar_enabled'] ?? true;
        $card = $cfg['contacts_enabled'] ?? true;
        $files = $cfg['files_enabled'] ?? true;

        $authBackend = new SabrePdoBasicAndCookieAuth($pdo, [
            'digestColumn' => 'digest',
        ]);
        $authBackend->setRealm((string) ($cfg['auth_realm'] ?? 'SabreDAV'));

        $authPlugin = new DAV\Auth\Plugin($authBackend);

        $principalBackend = new DAVACL\PrincipalBackend\PDO($pdo);

        $nodes = [];
        if ($cal || $card) {
            $nodes[] = new AppCalDAVPrincipalCollection($principalBackend, $pdo, $authPlugin);
        }
        if ($cal) {
            $caldavBackend = new CalDAV\Backend\PDO($pdo);
            $nodes[] = new AppCalendarRoot($principalBackend, $caldavBackend, $pdo, $authPlugin);
        }
        if ($card) {
            $carddavBackend = new CardDAV\Backend\PDO($pdo);
            $nodes[] = new AppAddressBookRoot($principalBackend, $carddavBackend, $pdo, $authPlugin);
        }
        if ($files) {
            $filesBase = Paths::data().'/files';
            $userFilesPath = $filesBase.'/users';
            $groupFilesPath = $filesBase.'/groups';
            foreach ([$filesBase, $userFilesPath, $groupFilesPath] as $dir) {
                if (!is_dir($dir)) {
                    @mkdir($dir, 0775, true);
                }
            }
            $nodes[] = new AppFilesRootCollection([
                new AppUserFilesHomeCollection($principalBackend, $userFilesPath, $pdo, $authPlugin),
                new GroupFilesPrincipalCollection($principalBackend, $groupFilesPath, $pdo, $authPlugin),
            ]);
        }

        if ($nodes === []) {
            throw new \RuntimeException('Invalid configuration: enable at least one of calendar_enabled, contacts_enabled, files_enabled (Admin → Settings or app_settings).');
        }

        $server = new DAV\Server($nodes);
        $server->setBaseUri((string) $cfg['base_uri']);
        $server->setLogger(new NullLogger());

        $server->addPlugin($authPlugin);
        $server->addPlugin(new WebdavWriteGuardPlugin());
        // Finder and other desktop WebDAV clients typically require locking or they mount read-only.
        $server->addPlugin(new Locks\Plugin(new Locks\Backend\File(Paths::data().'/webdav-locks.dat')));
        if ($cfg['browser_plugin'] ?? true) {
            $server->addPlugin(new DAV\Browser\Plugin());
        }
        $server->addPlugin(new DAV\Sync\Plugin());

        if ($cal || $card) {
            $server->addPlugin(new DAV\Sharing\Plugin());
        }
        if ($cal || $card || $files) {
            $server->addPlugin(new DAVACL\Plugin());
        }

        if ($cal) {
            $server->addPlugin(new CalDAV\Plugin());
            $server->addPlugin(new CalDAV\Schedule\Plugin());
            $server->addPlugin(new CalDAV\SharingPlugin());
            $server->addPlugin(new CalDAV\ICSExportPlugin());
        }

        if ($card) {
            $server->addPlugin(new CardDAV\Plugin());
            $server->addPlugin(new CardDAV\VCFExportPlugin());
        }

        $server->start();
    }
}

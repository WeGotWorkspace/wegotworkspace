<?php

declare(strict_types=1);

namespace App\Filegator;

use League\Flysystem\Adapter\Local;
use League\Flysystem\Config;
use League\Flysystem\Util;

/**
 * Flysystem local adapter scoped like WebDAV {@code files/}: non-admins may only see and
 * modify {@code users/{username}/…} and {@code groups/{slug}/…} for groups they belong to.
 */
final class SabreAclLocalAdapter extends Local
{
    /** @var list<string> */
    private array $allowedGroupSlugs;

    public function __construct(
        string $root,
        private readonly string $username,
        \PDO $pdo,
        int $writeFlags = LOCK_EX,
        int $linkHandling = self::DISALLOW_LINKS,
        array $permissions = []
    ) {
        parent::__construct($root, $writeFlags, $linkHandling, $permissions);
        $this->allowedGroupSlugs = FilegatorPathGuard::allowedGroupSlugs($pdo, $username);
    }

    public function has($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), false)) {
            return false;
        }

        return parent::has($path);
    }

    public function read($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), false)) {
            return false;
        }

        return parent::read($path);
    }

    public function readStream($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), false)) {
            return false;
        }

        return parent::readStream($path);
    }

    public function getMetadata($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), false)) {
            return false;
        }

        return parent::getMetadata($path);
    }

    public function getMimetype($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), false)) {
            return false;
        }

        return parent::getMimetype($path);
    }

    public function getTimestamp($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), false)) {
            return false;
        }

        return parent::getTimestamp($path);
    }

    public function getVisibility($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), false)) {
            return false;
        }

        return parent::getVisibility($path);
    }

    public function write($path, $contents, Config $config)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), true)) {
            return false;
        }

        return parent::write($path, $contents, $config);
    }

    public function writeStream($path, $resource, Config $config)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), true)) {
            return false;
        }

        return parent::writeStream($path, $resource, $config);
    }

    public function update($path, $contents, Config $config)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), true)) {
            return false;
        }

        return parent::update($path, $contents, $config);
    }

    public function updateStream($path, $resource, Config $config)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), true)) {
            return false;
        }

        return parent::updateStream($path, $resource, $config);
    }

    public function rename($path, $newpath)
    {
        $a = Util::normalizePath((string) $path);
        $b = Util::normalizePath((string) $newpath);
        if (!$this->isPathAllowed($a, true) || !$this->isPathAllowed($b, true)) {
            return false;
        }

        return parent::rename($path, $newpath);
    }

    public function copy($path, $newpath)
    {
        $a = Util::normalizePath((string) $path);
        $b = Util::normalizePath((string) $newpath);
        if (!$this->isPathAllowed($a, false) || !$this->isPathAllowed($b, true)) {
            return false;
        }

        return parent::copy($path, $newpath);
    }

    public function delete($path)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), true)) {
            return false;
        }

        return parent::delete($path);
    }

    public function deleteDir($dirname)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $dirname), true)) {
            return false;
        }

        return parent::deleteDir($dirname);
    }

    public function createDir($dirname, Config $config)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $dirname), true)) {
            return false;
        }

        return parent::createDir($dirname, $config);
    }

    public function setVisibility($path, $visibility)
    {
        if (!$this->isPathAllowed(Util::normalizePath((string) $path), true)) {
            return false;
        }

        return parent::setVisibility($path, $visibility);
    }

    public function listContents($directory = '', $recursive = false)
    {
        $path = Util::normalizePath((string) $directory);
        if (!$this->isPathAllowed($path, false)) {
            // Do not throw: Flysystem/Filegator routing can surface this as an uncaught fatal; empty listing is enough.
            return [];
        }
        $contents = parent::listContents($directory, $recursive);

        return array_values(array_filter(
            $contents,
            fn (array $item): bool => $this->isPathAllowed(Util::normalizePath($item['path']), false)
        ));
    }

    private function isPathAllowed(string $normalizedPath, bool $forWrite): bool
    {
        $path = $normalizedPath;
        if ($forWrite && ($path === 'users' || $path === 'groups')) {
            return false;
        }
        if ($path === '' || $path === '.') {
            return true;
        }
        $segments = explode('/', $path);
        $first = $segments[0];
        if ($first === 'users') {
            if (count($segments) === 1) {
                return true;
            }
            $owner = $segments[1];

            return strcasecmp($owner, $this->username) === 0;
        }
        if ($first === 'groups') {
            if (count($segments) === 1) {
                return true;
            }
            $slug = $segments[1];

            return in_array($slug, $this->allowedGroupSlugs, true);
        }

        return false;
    }

}

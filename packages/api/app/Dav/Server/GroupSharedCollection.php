<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Dav\Storage\FlysystemAclCollection;
use Illuminate\Contracts\Filesystem\Filesystem;
use Sabre\DAV;

final class GroupSharedCollection extends FlysystemAclCollection
{
    public function __construct(
        Filesystem $filesystem,
        string $key,
        private readonly string $groupPrincipalUri,
        private readonly \PDO $pdo,
    ) {
        parent::__construct($filesystem, $key, [], $groupPrincipalUri);
    }

    /**
     * @return list<array{privilege: string, principal: string, protected?: bool}>
     */
    public function getACL(): array
    {
        return GroupSharedAclHelper::aclForGroup($this->pdo, $this->groupPrincipalUri);
    }

    public function getChild($name): DAV\INode
    {
        if ($name === '.' || $name === '..') {
            throw new DAV\Exception\Forbidden('Permission denied to . and ..');
        }
        $key = $this->childKey($name);
        if ($this->filesystem->directoryExists($key)) {
            return new self($this->filesystem, $key, $this->groupPrincipalUri, $this->pdo);
        }
        if ($this->filesystem->fileExists($key)) {
            return new GroupSharedFile($this->filesystem, $key, $this->groupPrincipalUri, $this->pdo);
        }

        throw new DAV\Exception\NotFound('File could not be located');
    }
}

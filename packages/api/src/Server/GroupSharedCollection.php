<?php

declare(strict_types=1);

namespace App\Server;

use Sabre\DAV;
use Sabre\DAVACL\FS\Collection as AclFsCollection;

/**
 * Filesystem directory for a group shared space; ACL includes the group owner
 * plus each member principal so authenticated users can collaborate.
 */
final class GroupSharedCollection extends AclFsCollection
{
    public function __construct(
        string $path,
        private readonly string $groupPrincipalUri,
        private readonly \PDO $pdo,
    ) {
        parent::__construct($path, [], $groupPrincipalUri);
    }

    public function getACL(): array
    {
        return GroupSharedAclHelper::aclForGroup($this->pdo, $this->groupPrincipalUri);
    }

    public function getChild($name): DAV\INode
    {
        $path = $this->path.'/'.$name;

        if (!file_exists($path)) {
            throw new DAV\Exception\NotFound('File could not be located');
        }
        if ('.' === $name || '..' === $name) {
            throw new DAV\Exception\Forbidden('Permission denied to . and ..');
        }
        if (is_dir($path)) {
            return new self($path, $this->groupPrincipalUri, $this->pdo);
        }

        return new GroupSharedFile($path, $this->groupPrincipalUri, $this->pdo);
    }
}

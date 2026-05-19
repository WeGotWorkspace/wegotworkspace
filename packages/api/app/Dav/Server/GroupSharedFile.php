<?php

declare(strict_types=1);

namespace App\Dav\Server;

use Sabre\DAVACL\FS\File as AclFsFile;

final class GroupSharedFile extends AclFsFile
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
}

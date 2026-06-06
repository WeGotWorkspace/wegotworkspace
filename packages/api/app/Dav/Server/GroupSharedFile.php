<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Dav\Storage\FlysystemAclFile;
use Illuminate\Contracts\Filesystem\Filesystem;

final class GroupSharedFile extends FlysystemAclFile
{
    public function __construct(
        Filesystem $filesystem,
        string $key,
        private readonly string $groupPrincipalUri,
    ) {
        parent::__construct($filesystem, $key, [], $groupPrincipalUri);
    }

    /**
     * @return list<array{privilege: string, principal: string, protected?: bool}>
     */
    public function getACL(): array
    {
        return GroupSharedAclHelper::aclForGroup($this->groupPrincipalUri);
    }
}

<?php

declare(strict_types=1);

namespace App\Dav\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;
use Sabre\DAVACL\ACLTrait;
use Sabre\DAVACL\IACL;

class FlysystemAclFile extends FlysystemFile implements IACL
{
    use ACLTrait;

    /**
     * @param  list<array{privilege: string, principal: string, protected?: bool}>  $acl
     */
    public function __construct(
        Filesystem $filesystem,
        string $key,
        protected array $acl,
        protected ?string $owner = null,
    ) {
        parent::__construct($filesystem, $key);
    }

    public function getOwner(): ?string
    {
        return $this->owner;
    }

    /**
     * @return list<array{privilege: string, principal: string, protected?: bool}>
     */
    public function getACL(): array
    {
        return $this->acl;
    }
}

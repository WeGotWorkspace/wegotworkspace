<?php

declare(strict_types=1);

namespace App\Dav\Server;

use Sabre\DAV;
use Sabre\DAV\SimpleCollection;
use Sabre\DAVACL\ACLTrait;
use Sabre\DAVACL\IACL;

/**
 * Top-level {@code files} collection containing {@code users} and {@code groups} subtrees.
 */
final class AppFilesRootCollection extends SimpleCollection implements IACL
{
    use ACLTrait;

    /**
     * @param  list<DAV\INode>  $children
     */
    public function __construct(array $children)
    {
        parent::__construct('files', $children);
    }

    /**
     * @return list<array{principal: string, privilege: string, protected?: bool}>
     */
    public function getACL(): array
    {
        return [
            [
                'principal' => '{DAV:}authenticated',
                'privilege' => '{DAV:}read',
                'protected' => true,
            ],
        ];
    }
}

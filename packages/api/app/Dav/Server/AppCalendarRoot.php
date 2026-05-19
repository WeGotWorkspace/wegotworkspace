<?php

declare(strict_types=1);

namespace App\Dav\Server;

use Sabre\CalDAV\Backend\BackendInterface;
use Sabre\CalDAV\CalendarRoot;
use Sabre\DAV;
use Sabre\DAV\Auth\Plugin as AuthPlugin;
use Sabre\DAVACL\PrincipalBackend\BackendInterface as PrincipalBackend;

/**
 * {@see CalendarRoot} with per-request listing limited to the authenticated account.
 */
final class AppCalendarRoot extends CalendarRoot
{
    public function __construct(
        PrincipalBackend $principalBackend,
        BackendInterface $caldavBackend,
        private readonly \PDO $pdo,
        private readonly AuthPlugin $authPlugin,
        string $principalPrefix = 'principals',
    ) {
        parent::__construct($principalBackend, $caldavBackend, $principalPrefix);
    }

    /**
     * @return list<DAV\INode>
     */
    public function getChildren(): array
    {
        if ($this->disableListing) {
            throw new DAV\Exception\MethodNotAllowed('Listing members of this collection is disabled');
        }
        $current = $this->authPlugin->getCurrentPrincipal();
        if ($current === null || $current === '') {
            return [];
        }
        $principalInfo = $this->principalBackend->getPrincipalByPath($current);
        if (!$principalInfo || !AccountPrincipalFilter::isAccountPrincipal($this->pdo, $principalInfo)) {
            return [];
        }

        return [$this->getChildForPrincipal($principalInfo)];
    }

    public function getChild($name): DAV\INode
    {
        $principalInfo = $this->principalBackend->getPrincipalByPath($this->principalPrefix.'/'.$name);
        if (!$principalInfo || !AccountPrincipalFilter::isAccountPrincipal($this->pdo, $principalInfo)) {
            throw new DAV\Exception\NotFound('Principal with name '.$name.' not found');
        }
        $current = $this->authPlugin->getCurrentPrincipal();
        if ($current === null || $current === '' || ($principalInfo['uri'] ?? '') !== $current) {
            throw new DAV\Exception\NotFound('Principal with name '.$name.' not found');
        }

        return $this->getChildForPrincipal($principalInfo);
    }

    public function childExists($name): bool
    {
        $current = $this->authPlugin->getCurrentPrincipal();
        if ($current === null || $current === '') {
            return false;
        }
        $principalInfo = $this->principalBackend->getPrincipalByPath($this->principalPrefix.'/'.$name);
        if (!$principalInfo) {
            return false;
        }

        return AccountPrincipalFilter::isAccountPrincipal($this->pdo, $principalInfo)
            && ($principalInfo['uri'] ?? '') === $current;
    }
}

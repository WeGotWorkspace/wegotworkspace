<?php

declare(strict_types=1);

namespace App\Server;

use App\SabreUiAuthGate;
use Sabre\DAV\Auth\Backend\PDOBasicAuth;
use Sabre\HTTP\RequestInterface;
use Sabre\HTTP\ResponseInterface;

/**
 * Same as {@see PDOBasicAuth}, but also accepts the signed {@code sabre_ui_auth} cookie issued after
 * Drive / Office HTML login ({@see SabreUiAuthGate}) so browser {@code fetch()} to WebDAV works without
 * resending HTTP Basic on every request.
 */
final class SabrePdoBasicAndCookieAuth extends PDOBasicAuth
{
    public function check(RequestInterface $request, ResponseInterface $response)
    {
        $fromGate = SabreUiAuthGate::validatedUsername($this->realm);
        if ($fromGate !== null) {
            return [true, $this->principalPrefix.$fromGate];
        }

        return parent::check($request, $response);
    }
}

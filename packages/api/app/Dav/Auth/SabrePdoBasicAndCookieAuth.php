<?php

declare(strict_types=1);

namespace App\Dav\Auth;

use Sabre\DAV\Auth\Backend\PDOBasicAuth;
use Sabre\HTTP\RequestInterface;
use Sabre\HTTP\ResponseInterface;

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

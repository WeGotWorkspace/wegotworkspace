<?php

declare(strict_types=1);

namespace App\Services\Auth;

use Illuminate\Support\Facades\DB;
use Sabre\DAV\Auth\Backend\PDOBasicAuth;

final class SabreCredentialValidator
{
    public function validate(string $username, string $password, string $realm): bool
    {
        $auth = new PDOBasicAuth(DB::connection('wgw')->getPdo(), ['digestColumn' => 'digest']);
        $auth->setRealm($realm);

        return $auth->validateUserPass($username, $password);
    }
}

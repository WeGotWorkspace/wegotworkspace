<?php

declare(strict_types=1);

/**
 * WeGotWorkspace front controller — all HTTP enters the Laravel app in packages/api.
 */

require __DIR__.'/bootstrap/WgwAppBootstrap.php';

WgwAppBootstrap::run(__DIR__);

<?php
declare(strict_types=1);

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$filePath = realpath(__DIR__ . '/out' . $requestUri);
$outRoot = realpath(__DIR__ . '/out');

if (
    $outRoot !== false &&
    $filePath !== false &&
    str_starts_with($filePath, $outRoot) &&
    is_file($filePath)
) {
    return false;
}

if ($requestUri !== '/' && str_ends_with($requestUri, '/')) {
    $requestUri = rtrim($requestUri, '/');
}

$indexPath = realpath(__DIR__ . '/out' . $requestUri . '/index.html');
if (
    $outRoot !== false &&
    $indexPath !== false &&
    str_starts_with($indexPath, $outRoot) &&
    is_file($indexPath)
) {
    readfile($indexPath);
    return true;
}

readfile(__DIR__ . '/out/index.html');
return true;

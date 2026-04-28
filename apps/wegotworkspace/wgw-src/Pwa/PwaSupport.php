<?php

declare(strict_types=1);

namespace App\Pwa;

use App\Installer\WebBase;

final class PwaSupport
{
    /**
     * @var array<string, array{title:string,short:string,start:string,scope:string,bg:string,fg:string,badge:string}>
     */
    private const APPS = [
        'home' => ['title' => 'WeGotWorkspace', 'short' => 'WGW', 'start' => '/', 'scope' => '/', 'bg' => '#111827', 'fg' => '#f9fafb', 'badge' => 'WG'],
        'drive' => ['title' => 'Drive', 'short' => 'Drive', 'start' => '/drive/', 'scope' => '/drive/', 'bg' => '#0f766e', 'fg' => '#ecfeff', 'badge' => 'DR'],
        'mail' => ['title' => 'Mail', 'short' => 'Mail', 'start' => '/mail/', 'scope' => '/mail/', 'bg' => '#1d4ed8', 'fg' => '#eff6ff', 'badge' => 'ML'],
        'voice' => ['title' => 'Voice', 'short' => 'Voice', 'start' => '/voice/', 'scope' => '/voice/', 'bg' => '#7c3aed', 'fg' => '#f5f3ff', 'badge' => 'VC'],
        'notes' => ['title' => 'Notes', 'short' => 'Notes', 'start' => '/notes/', 'scope' => '/notes/', 'bg' => '#b45309', 'fg' => '#fffbeb', 'badge' => 'NT'],
        'office' => ['title' => 'Office', 'short' => 'Office', 'start' => '/office/', 'scope' => '/office/', 'bg' => '#047857', 'fg' => '#ecfdf5', 'badge' => 'OF'],
        'admin' => ['title' => 'Admin', 'short' => 'Admin', 'start' => '/admin/', 'scope' => '/admin/', 'bg' => '#991b1b', 'fg' => '#fef2f2', 'badge' => 'AD'],
        'settings' => ['title' => 'Settings', 'short' => 'Settings', 'start' => '/settings/', 'scope' => '/settings/', 'bg' => '#374151', 'fg' => '#f9fafb', 'badge' => 'ST'],
    ];

    public static function tryRespond(string $webBase, string $path): bool
    {
        $manifestPrefix = WebBase::url($webBase, '/pwa/manifest');
        if (str_starts_with($path, $manifestPrefix.'/') && str_ends_with($path, '.webmanifest')) {
            $app = substr($path, strlen($manifestPrefix) + 1, -strlen('.webmanifest'));
            if (!is_string($app) || !isset(self::APPS[$app])) {
                return false;
            }

            self::respondManifest($webBase, $app);

            return true;
        }

        $iconPrefix = WebBase::url($webBase, '/pwa/icon');
        if (str_starts_with($path, $iconPrefix.'/') && str_ends_with($path, '.svg')) {
            $app = substr($path, strlen($iconPrefix) + 1, -strlen('.svg'));
            if (!is_string($app) || !isset(self::APPS[$app])) {
                return false;
            }

            self::respondIcon($app);

            return true;
        }

        return false;
    }

    public static function headMetaTags(string $webBase, string $app): string
    {
        if (!isset(self::APPS[$app])) {
            return '';
        }
        $cfg = self::APPS[$app];
        $manifestUrl = WebBase::url($webBase, '/pwa/manifest/'.$app.'.webmanifest');
        $iconUrl = WebBase::url($webBase, '/pwa/icon/'.$app.'.svg');
        $name = htmlspecialchars($cfg['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $theme = htmlspecialchars($cfg['bg'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $manifestEsc = htmlspecialchars($manifestUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $iconEsc = htmlspecialchars($iconUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return '<meta name="theme-color" content="'.$theme.'" data-wgw-pwa="1">'."\n"
            .'<meta name="mobile-web-app-capable" content="yes">'."\n"
            .'<meta name="apple-mobile-web-app-capable" content="yes">'."\n"
            .'<meta name="apple-touch-fullscreen" content="yes">'."\n"
            .'<meta name="apple-mobile-web-app-title" content="'.$name.'">'."\n"
            .'<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'."\n"
            .'<meta name="application-name" content="'.$name.'">'."\n"
            .'<link rel="manifest" href="'.$manifestEsc.'">'."\n"
            .'<link rel="icon" href="'.$iconEsc.'" type="image/svg+xml">'."\n"
            .'<link rel="apple-touch-icon" href="'.$iconEsc.'">';
    }

    private static function respondManifest(string $webBase, string $app): void
    {
        $cfg = self::APPS[$app];
        $iconUrl = WebBase::url($webBase, '/pwa/icon/'.$app.'.svg');
        $manifest = [
            'id' => WebBase::url($webBase, $cfg['scope']),
            'name' => $cfg['title'],
            'short_name' => $cfg['short'],
            'start_url' => WebBase::url($webBase, $cfg['start']),
            'scope' => WebBase::url($webBase, $cfg['scope']),
            'display' => 'fullscreen',
            'display_override' => ['fullscreen', 'standalone', 'minimal-ui'],
            'background_color' => $cfg['bg'],
            'theme_color' => $cfg['bg'],
            'icons' => [
                [
                    'src' => $iconUrl,
                    'sizes' => 'any',
                    'type' => 'image/svg+xml',
                    'purpose' => 'any maskable',
                ],
            ],
        ];

        header('Content-Type: application/manifest+json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        echo json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    private static function respondIcon(string $app): void
    {
        $cfg = self::APPS[$app];
        $bg = htmlspecialchars($cfg['bg'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $fg = htmlspecialchars($cfg['fg'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $badge = htmlspecialchars($cfg['badge'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
            .'<rect width="512" height="512" rx="116" fill="'.$bg.'"/>'
            .'<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" '
            .'font-family="Inter,Segoe UI,Roboto,system-ui,sans-serif" font-size="182" '
            .'font-weight="700" fill="'.$fg.'">'.$badge.'</text>'
            .'</svg>';

        header('Content-Type: image/svg+xml; charset=utf-8');
        header('Cache-Control: public, max-age=86400');
        echo $svg;
    }
}

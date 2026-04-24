<?php

declare(strict_types=1);

namespace App\Home;

use App\Config;
use App\Drive\DriveStatic;
use App\Installer\WebBase;
use App\Mail\MailStatic;
use App\Paths;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;
use App\Voice\VoiceStatic;

/**
 * Lightweight app launcher at the install URL root ({@code /} or {@code /myapp/}).
 *
 * Same {@see SabreUiAuthGate} as Drive / Office HTML: signed UI cookie, optional HTTP Basic, or browser redirect to
 * {@code /login/} for top-level HTML navigation.
 * Only {@code GET} and {@code HEAD} are handled so {@code PROPFIND}/{@code OPTIONS} on {@code /} still reach SabreDAV.
 * {@code /.well-known/caldav} and {@code /.well-known/carddav} are registered earlier in {@code index.php}.
 */
final class HomeKernel
{
    public static function tryRespond(string $webBase, string $path): bool
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method !== 'GET' && $method !== 'HEAD') {
            return false;
        }
        // SabreDAV Browser plugin serves assets and helper views via root query params
        // like "/?sabreAction=asset..."; let those requests pass through to SabreApp.
        if (isset($_GET['sabreAction']) && is_string($_GET['sabreAction']) && $_GET['sabreAction'] !== '') {
            return false;
        }
        if (!self::isInstallRoot($webBase, $path)) {
            return false;
        }

        try {
            $cfg = Config::load();
        } catch (\Throwable) {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo "Could not load configuration.\n";

            return true;
        }

        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
        $realm = (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');
        $signedInUser = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);

        $filesOn = (bool) ($cfg[SettingsKeys::FILES_ENABLED] ?? true);
        $driveOk = $filesOn && DriveStatic::distReady();
        $mailOk = $filesOn && MailStatic::distReady();
        $voiceOk = $filesOn && VoiceStatic::distReady();
        $officeRoot = Paths::officeUiBuild();
        $officeOk = $filesOn && is_readable($officeRoot.'/index.html') && is_readable($officeRoot.'/editor.html');

        $e = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        /** Browser tab + header product name (auth realm stays in {@code $realm} for Sabre). */
        $title = 'WeGotWorkspace';
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $scheme = $https ? 'https' : 'http';
        $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $origin = $scheme.'://'.$host;

        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: private, max-age=0, must-revalidate');

        if ($method === 'HEAD') {
            return true;
        }

        $admin = WebBase::url($webBase, '/admin/');
        $settings = WebBase::url($webBase, '/settings/');
        $drive = WebBase::url($webBase, '/drive/');
        $mail = WebBase::url($webBase, '/mail/');
        $voice = WebBase::url($webBase, '/voice/');
        $office = WebBase::url($webBase, '/office/');
        $editor = WebBase::url($webBase, '/office/editor');
        $wkCal = WebBase::url($webBase, '/.well-known/caldav');
        $wkCard = WebBase::url($webBase, '/.well-known/carddav');
        $logout = WebBase::url($webBase, '/logout/');

        ob_start();
        ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title><?= $e($title) ?> — Home</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Instrument+Serif:ital@0;1&amp;display=swap" rel="stylesheet">
<style>
/* Light-only, airy palette (softer than Drive default light) */
:root {
  color-scheme: light;
  --radius: 0.75rem;
  --background: oklch(0.995 0.002 95);
  --foreground: oklch(0.32 0.018 260);
  --surface: oklch(1 0 0);
  --surface-elevated: oklch(0.998 0.002 95);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.32 0.018 260);
  --primary: oklch(0.45 0.09 265);
  --primary-foreground: oklch(0.99 0.004 95);
  --secondary: oklch(0.978 0.006 95);
  --secondary-foreground: oklch(0.35 0.02 260);
  --muted: oklch(0.97 0.005 95);
  --muted-foreground: oklch(0.56 0.016 260);
  --border: oklch(0.94 0.005 95);
  --ring: oklch(0.62 0.1 265);
  --doc: oklch(0.68 0.12 250);
  --sheet: oklch(0.72 0.12 150);
  --slide: oklch(0.76 0.13 55);
  --pdf: oklch(0.68 0.14 25);
  --folder: oklch(0.78 0.1 85);
  --shadow-soft: 0 1px 2px oklch(0.25 0.02 260 / 0.025), 0 6px 20px oklch(0.25 0.02 260 / 0.03);
  --shadow-elevated: 0 2px 6px oklch(0.25 0.02 260 / 0.04), 0 16px 40px oklch(0.25 0.02 260 / 0.05);
  --gradient-hero: linear-gradient(135deg, oklch(0.72 0.08 265) 0%, oklch(0.78 0.1 285) 100%);
  --gradient-page: linear-gradient(180deg, oklch(1 0 0) 0%, oklch(0.985 0.004 95) 55%, oklch(0.975 0.006 95) 100%);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  font-feature-settings: "cv11", "ss01", "ss03";
  -webkit-font-smoothing: antialiased;
  background: var(--gradient-page);
  color: var(--foreground);
}
.page {
  max-width: 56rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  width: 100%;
}
.hero-bar {
  height: 2px;
  border-radius: 999px;
  background: var(--gradient-hero);
  margin-bottom: 1.35rem;
  opacity: 0.65;
}
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}
.brand h1 {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--foreground);
}
.brand .realm {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted-foreground);
  margin-top: 0.35rem;
}
.brand .realm strong {
  color: var(--foreground);
  font-weight: 600;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.9rem;
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
}
.btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: var(--shadow-soft);
}
.btn-primary:hover {
  filter: brightness(1.06);
}
.btn-secondary {
  background: var(--secondary);
  color: var(--secondary-foreground);
  border-color: var(--border);
}
.btn-secondary:hover {
  background: var(--muted);
}
.btn-ghost {
  background: transparent;
  color: var(--muted-foreground);
  border-color: transparent;
}
.btn-ghost:hover {
  background: var(--muted);
  color: var(--foreground);
}
.lead {
  margin: 0 0 1.75rem;
  max-width: 36rem;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--muted-foreground);
}
.panel {
  background: var(--card);
  border: 1px solid oklch(0.93 0.004 95 / 0.85);
  border-radius: var(--radius);
  padding: 1.25rem 1.15rem 1.35rem;
  margin-bottom: 1.25rem;
  box-shadow: var(--shadow-soft);
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.section-title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.75rem;
}
a.tile, span.tile-disabled {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.55rem;
  padding: 1.1rem 0.65rem;
  min-height: 7rem;
  justify-content: center;
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}
a.tile:hover {
  border-color: oklch(0.62 0.08 265 / 0.28);
  box-shadow: var(--shadow-elevated);
  transform: translateY(-1px);
}
a.tile:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
span.tile-disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
.tile .icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.65rem;
  height: 2.65rem;
  border-radius: 0.65rem;
  background: var(--muted);
}
a.tile:hover .icon-wrap {
  background: oklch(0.62 0.08 265 / 0.08);
}
.tile svg {
  width: 1.45rem;
  height: 1.45rem;
  stroke-width: 1.65;
}
.tile span.name {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25;
}
.tile-disabled .icon-wrap {
  background: var(--muted);
}
.foot {
  margin-top: 0.5rem;
  padding: 1.1rem 1.15rem;
  border-radius: var(--radius);
  border: 1px solid oklch(0.93 0.004 95 / 0.85);
  background: oklch(0.995 0.002 95);
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--muted-foreground);
}
.foot strong {
  color: var(--foreground);
  font-weight: 600;
}
.foot code {
  font-size: 0.75em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  background: var(--muted);
  border: 1px solid var(--border);
  word-break: break-all;
}
</style>
</head>
<body>
<div class="page">
  <div class="hero-bar" aria-hidden="true"></div>
  <header class="top">
    <div class="brand">
      <h1>Home</h1>
      <p class="realm"><?= $e($title) ?> · <?= $e($realm) ?> · signed in as <strong><?= $e($signedInUser) ?></strong></p>
    </div>
    <nav class="actions" aria-label="Account">
      <a class="btn btn-secondary" href="<?= $e($settings) ?>">My settings</a>
      <a class="btn btn-secondary" href="<?= $e($admin) ?>">Admin</a>
      <a class="btn btn-ghost" href="<?= $e($logout) ?>">Sign out</a>
    </nav>
  </header>


  <section class="panel" aria-labelledby="sec-apps">
    <div class="section-head">
      <h2 id="sec-apps" class="section-title">Storage &amp; comms</h2>
    </div>
    <div class="grid">
<?php if ($driveOk): ?>
    <a class="tile" href="<?= $e($drive) ?>"><span class="icon-wrap" style="color: var(--folder)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 7.5h6l1.5 2H21V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5z"/><path d="M3 7.5 6 4.5h5l3 3"/></svg></span><span class="name">Drive</span></a>
<?php else: ?>
    <span class="tile-disabled tile"><span class="icon-wrap" style="color: var(--muted-foreground)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 7.5h6l1.5 2H21V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5z"/></svg></span><span class="name">Drive</span></span>
<?php endif; ?>

<?php if ($mailOk): ?>
    <a class="tile" href="<?= $e($mail) ?>"><span class="icon-wrap" style="color: var(--primary)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span><span class="name">Mail</span></a>
<?php else: ?>
    <span class="tile-disabled tile"><span class="icon-wrap" style="color: var(--muted-foreground)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/></svg></span><span class="name">Mail</span></span>
<?php endif; ?>

<?php if ($voiceOk): ?>
    <a class="tile" href="<?= $e($voice) ?>"><span class="icon-wrap" style="color: var(--primary)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"/><path d="M19 11v1a7 7 0 0 1-14 0v-1M12 18v3"/></svg></span><span class="name">Voice</span></a>
<?php else: ?>
    <span class="tile-disabled tile"><span class="icon-wrap" style="color: var(--muted-foreground)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"/></svg></span><span class="name">Voice</span></span>
<?php endif; ?>
    </div>
  </section>

  <section class="panel" aria-labelledby="sec-office">
    <div class="section-head">
      <h2 id="sec-office" class="section-title">Office</h2>
    </div>
    <div class="grid">
<?php if ($officeOk): ?>
    <a class="tile" href="<?= $e($office) ?>"><span class="icon-wrap" style="color: var(--primary)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M7 4h8l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M14 4v4h4"/></svg></span><span class="name">Home</span></a>
    <a class="tile" href="<?= $e($editor.'?new=docx') ?>"><span class="icon-wrap" style="color: var(--doc)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M7 4h8l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M9 12h6M9 16h4"/></svg></span><span class="name">Document</span></a>
    <a class="tile" href="<?= $e($editor.'?new=xlsx') ?>"><span class="icon-wrap" style="color: var(--sheet)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg></span><span class="name">Sheet</span></a>
    <a class="tile" href="<?= $e($editor.'?new=pptx') ?>"><span class="icon-wrap" style="color: var(--slide)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></span><span class="name">Slides</span></a>
    <a class="tile" href="<?= $e($editor.'?new=pdf') ?>"><span class="icon-wrap" style="color: var(--pdf)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M7 4h8l3 3v11H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M9 15h4"/></svg></span><span class="name">PDF</span></a>
<?php else: ?>
    <span class="tile-disabled tile" style="grid-column: 1 / -1;"><span class="name">Office — build missing or files disabled</span></span>
<?php endif; ?>
    </div>
  </section>

</div>
</body>
</html>
<?php
        echo ob_get_clean();

        return true;
    }

    private static function isInstallRoot(string $webBase, string $path): bool
    {
        $withSlash = WebBase::url($webBase, '/');
        if ($path === $withSlash) {
            return true;
        }
        if ($webBase !== '') {
            return $path === $webBase || $path === $webBase.'/';
        }

        return false;
    }
}

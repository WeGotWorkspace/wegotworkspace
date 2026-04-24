<?php

declare(strict_types=1);

namespace App\Auth;

use App\Admin\AuthService;
use App\Config;
use App\Installer\WebBase;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;

/**
 * Browser sign-in for Drive, Mail, Voice, Office HTML, and the home launcher: form POST + {@see SabreUiAuthGate}
 * session cookie. SabreDAV / CalDAV / CardDAV keep using HTTP Basic (and the UI cookie where the backend allows it).
 */
final class UiLoginKernel
{
    /** Shown in the login page {@code <title>}, header brand, meta description, and footer (auth still uses {@see SettingsKeys::AUTH_REALM}). */
    private const SIGN_IN_APP_DISPLAY_NAME = 'WeGotWorkspace';

    public static function matchesPath(string $webBase, string $path): bool
    {
        $login = WebBase::url($webBase, '/login');
        $logout = WebBase::url($webBase, '/logout');

        return $path === $login || $path === $login.'/'
            || $path === $logout || $path === $logout.'/';
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
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

        if (!($cfg[SettingsKeys::FILES_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'WebDAV files are disabled for this site.';

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

        $logout = WebBase::url($webBase, '/logout');
        if ($path === $logout || $path === $logout.'/') {
            self::respondLogout($webBase);

            return true;
        }

        $login = WebBase::url($webBase, '/login');
        if ($path === $login) {
            self::redirectTo($webBase, '/login/');

            return true;
        }

        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method === 'POST') {
            self::respondLoginPost($pdo, $realm, $webBase);

            return true;
        }

        if ($method !== 'GET' && $method !== 'HEAD') {
            http_response_code(405);
            header('Allow: GET, HEAD, POST');

            return true;
        }

        self::respondLoginGet($realm, $webBase, $method === 'HEAD');

        return true;
    }

    private static function respondLogout(string $webBase): void
    {
        SabreUiAuthGate::clearSession($webBase);
        self::redirectTo($webBase, '/');
    }

    private static function respondLoginPost(\PDO $pdo, string $realm, string $webBase): void
    {
        self::assertTrustedFormOrigin();

        $user = isset($_POST['username']) && is_string($_POST['username']) ? trim($_POST['username']) : '';
        $pass = isset($_POST['password']) && is_string($_POST['password']) ? $_POST['password'] : '';
        $return = isset($_POST['return']) && is_string($_POST['return']) ? $_POST['return'] : '';

        if ($user === '' || $pass === '' || !AuthService::validateWithPdo($pdo, strtolower($user), $pass, $realm)) {
            self::respondLoginGet($realm, $webBase, false, self::sanitizeReturnPath($webBase, $return), 'invalid');

            return;
        }

        SabreUiAuthGate::establishSession($user, $realm, $webBase);
        $target = self::sanitizeReturnPath($webBase, $return);
        self::redirectToPath($target);
    }

    private static function respondLoginGet(
        string $realm,
        string $webBase,
        bool $headOnly,
        ?string $returnOverride = null,
        ?string $error = null,
    ): void {
        $existing = SabreUiAuthGate::validatedUsername($realm);
        if ($existing !== null) {
            $ret = $returnOverride ?? self::returnFromQuery();
            self::redirectToPath(self::sanitizeReturnPath($webBase, $ret));

            return;
        }

        $return = $returnOverride ?? self::returnFromQuery();
        $return = self::sanitizeReturnPath($webBase, $return);
        $e = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $err = $error === 'invalid'
            ? '<p class="err" role="alert">That username or password does not match this server.</p>'
            : '';

        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        if ($headOnly) {
            return;
        }

        $app = self::SIGN_IN_APP_DISPLAY_NAME;
        $title = $app.' — Sign in';
        $home = WebBase::url($webBase, '/');
        $year = (int) date('Y');
        echo '<!DOCTYPE html><html lang="en"><head>';
        echo '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
        echo '<meta name="color-scheme" content="light">';
        echo '<meta name="description" content="Sign in to '.$e($app).', the cloud workspace built for modern teams.">';
        echo '<title>'.$e($title).'</title>';
        echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
        echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
        echo '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">';
        echo '<style>
/* shadcn-style HSL tokens + layout/spacing matching the reference sign-in page */
:root {
  color-scheme: light;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: oklch(0.58 0.235 27);
  --primary: var(--accent);
  --primary-foreground: oklch(0.99 0.004 95);
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: var(--accent);
  --brand: var(--accent);
  --destructive: 0 84.2% 60.2%;
  --radius: 0.375rem;
  --shadow-sm: 0 1px 2px 0 rgb(15 23 42 / 0.05);
  --shadow: 0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: hsl(var(--background));
}
.shell-header {
  padding: 1.5rem 1.5rem;
}
@media (min-width: 40rem) {
  .shell-header { padding: 1.5rem 2.5rem; }
}
.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  text-decoration: none;
  color: var(--brand);
}
.brand-link:hover { opacity: 0.9; }
.brand-link:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: calc(var(--radius) + 2px);
}
.brand-text {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 800;
  letter-spacing: -0.025em;
}
.shell-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
}
.form-wrap {
  width: 100%;
  max-width: 24rem;
}
.intro { margin-bottom: 2rem; }
.intro h1 {
  margin: 0;
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--brand);
}
@media (min-width: 40rem) {
  .intro h1 {
    font-size: 2.25rem;
    line-height: 2.5rem;
  }
}
.intro .subtitle {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: hsl(var(--muted-foreground));
}
.form-stack { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.5rem; }
.field label {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  color: hsl(var(--foreground));
}
.field input[type=text],
.field input[type=password] {
  display: flex;
  width: 100%;
  height: 2.75rem;
  border-radius: calc(var(--radius));
  border: 1px solid hsl(var(--input));
  background: transparent;
  padding: 0.25rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5rem;
  color: inherit;
  box-shadow: var(--shadow-sm);
  transition: color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
@media (min-width: 48rem) {
  .field input[type=text],
  .field input[type=password] { font-size: 0.875rem; line-height: 1.25rem; }
}
.field input::placeholder { color: hsl(var(--muted-foreground)); }
.field input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--ring);
}
button[type=submit] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 2.75rem;
  border: none;
  border-radius: calc(var(--radius));
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: background-color 0.15s ease, color 0.15s ease;
}
button[type=submit]:hover {
  background: color-mix(in oklch, var(--primary), black 10%);
}
button[type=submit]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--ring), var(--shadow);
}
button[type=submit]:disabled {
  pointer-events: none;
  opacity: 0.5;
}
.shell-footer {
  padding: 1.5rem 1.5rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--muted-foreground));
}
@media (min-width: 40rem) {
  .shell-footer { padding: 1.5rem 2.5rem; }
}
p.err {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  line-height: 1.45;
  color: hsl(var(--destructive));
}
</style></head><body>';
        echo '<main class="shell" role="main">';
        echo '<header class="shell-header"><a class="brand-link" href="'.$e($home).'"><span class="brand-text">'.$e($app).'</span></a></header>';
        echo '<div class="shell-body"><div class="form-wrap">';
        echo '<div class="intro"><h1>Welcome back.</h1>';
        echo '<p class="subtitle">Sign in to your workspace to continue.</p></div>';
        echo $err;
        echo '<form class="form-stack" method="post" action="'.$e(WebBase::url($webBase, '/login/')).'">';
        echo '<input type="hidden" name="return" value="'.$e($return).'">';
        echo '<div class="field"><label for="u">Username</label>';
        echo '<input id="u" name="username" type="text" autocomplete="username" placeholder="yourname" required></div>';
        echo '<div class="field"><label for="p">Password</label>';
        echo '<input id="p" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required></div>';
        echo '<button type="submit">Sign in</button></form>';
        echo '</div></div>';
        echo '<footer class="shell-footer"><span>© '.$year.' '.$e($app).'</span></footer>';
        echo '</main></body></html>';
    }

    private static function returnFromQuery(): string
    {
        if (!isset($_GET['return']) || !is_string($_GET['return'])) {
            return '';
        }

        return $_GET['return'];
    }

    /**
     * @return non-empty-string
     */
    private static function sanitizeReturnPath(string $webBase, string $return): string
    {
        $return = trim($return);
        $home = WebBase::url($webBase, '/');
        if ($return === '') {
            return $home;
        }
        if ($return[0] !== '/' || str_starts_with($return, '//')) {
            return $home;
        }

        $login = WebBase::url($webBase, '/login');
        if ($return === $login || $return === $login.'/' || str_starts_with($return, $login.'/')) {
            return $home;
        }

        $logout = WebBase::url($webBase, '/logout');
        if ($return === $logout || $return === $logout.'/' || str_starts_with($return, $logout.'/')) {
            return $home;
        }

        if ($webBase !== '' && $return !== $webBase && !str_starts_with($return, $webBase.'/')) {
            return $home;
        }

        return $return;
    }

    private static function assertTrustedFormOrigin(): void
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $expected = $scheme.'://'.$host;
        $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
        if ($origin !== '' && !str_starts_with($origin, $expected)) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Forbidden';
            exit;
        }
        $ref = (string) ($_SERVER['HTTP_REFERER'] ?? '');
        if ($origin === '' && $ref !== '' && !str_starts_with($ref, $expected)) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Forbidden';
            exit;
        }
    }

    private static function redirectTo(string $webBase, string $path): void
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        header('Location: '.$scheme.'://'.$host.WebBase::url($webBase, $path), true, 302);
        exit;
    }

    private static function redirectToPath(string $path): void
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        header('Location: '.$scheme.'://'.$host.$path, true, 302);
        exit;
    }
}

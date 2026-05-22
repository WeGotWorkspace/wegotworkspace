# Install WeGotWorkspace

This is the quickest way to install on a normal Apache/PHP host.

## 1) Upload files

Upload the deploy package contents to your website folder so these files are in place:
- `index.php`
- `bootstrap/` (front controller bootstrap before Laravel loads)
- `.htaccess`
- `packages/api/` (OpenAPI contract; production releases will again include a Composer `vendor/` once the Laravel API is restored)
- `packages/apps/` (includes built web app bundles, for example `packages/apps/drive/dist/`)
- `wgw-config.sample.php`

Your site document root must point to this folder.

## 2) Laravel API environment (`packages/api/.env`)

The API needs a local `.env` (not included in release ZIPs). After upload or an in-place update, create or restore it:

```bash
cp packages/api/.env.example packages/api/.env
php artisan key:generate --working-dir packages/api
```

Set `APP_URL` to your public URL and `APP_ENV=production` / `APP_DEBUG=false` on a live host.  
Default drivers use files under `packages/api/storage/` so you do not need `packages/api/database/database.sqlite`.  
The web installer also creates `.env` and `APP_KEY` automatically when `packages/api` is present.  
In-place updates preserve `.env`, session files, and logs, and copy `.env` into the update backup folder as `packages-api.env`.

## 3) Create `.htaccess` (if needed)

If your host does not keep dotfiles from ZIP uploads:

```bash
cp example.htaccess .htaccess
```

Or do the same in your hosting file manager by duplicating `example.htaccess` and naming the copy `.htaccess`.

## 4) Open the installer

Visit:

- `https://your-domain/install/`

Then follow the wizard:
- Check requirements
- Choose SQLite (quickest) or MySQL
- Create the first account

## 5) Done

After setup, sign in with your new account and connect clients using the same site URL.

If your install is in a subfolder, set `RewriteBase` in `.htaccess` to that subfolder path.

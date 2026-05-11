# Install WeGotWorkspace

This is the quickest way to install on a normal Apache/PHP host.

## 1) Upload files

Upload the deploy package contents to your website folder so these files are in place:
- `index.php`
- `.htaccess`
- `packages/api/`
- `packages/api/vendor/`
- `packages/apps/` (includes built web app bundles, for example `packages/apps/drive/dist/`)
- `wgw-config.sample.php`

Your site document root must point to this folder.

## 2) Create `.htaccess` (if needed)

If your host does not keep dotfiles from ZIP uploads:

```bash
cp example.htaccess .htaccess
```

Or do the same in your hosting file manager by duplicating `example.htaccess` and naming the copy `.htaccess`.

## 3) Open the installer

Visit:

- `https://your-domain/install/`

Then follow the wizard:
- Check requirements
- Choose SQLite (quickest) or MySQL
- Create the first account

## 4) Done

After setup, sign in with your new account and connect clients using the same site URL.

If your install is in a subfolder, set `RewriteBase` in `.htaccess` to that subfolder path.

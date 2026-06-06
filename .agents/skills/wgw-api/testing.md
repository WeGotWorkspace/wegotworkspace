# API testing (Pest)

## Gate

A domain is **not done** until feature tests pass for its routes without calling legacy handlers, and **`composer greenfield:guard`** passes.

## Required

- Feature test per controller/route (status + JSON vs OpenAPI / captured fixtures)
- Unit tests for services and non-trivial repositories
- `RefreshDatabase` on feature tests; factories — no hardcoded IDs
- File features: `Storage::fake('wgw_files')` / `wgw_notes` — no manual `$tmpDir` unless configuring fake disk root

## Architecture tests

`tests/Architecture/GreenfieldArchitectureTest.php` and `scripts/greenfield-guard.php` enforce:

- No legacy handlers, `Paths`, or raw file I/O in domain layers
- Domain services do not use `DB::connection('wgw')->table()`
- All `app/Models/*.php` use `UsesWgwConnection`
- No runtime `ALTER TABLE` DDL in domain services

PHPUnit example patterns (Pest optional):

```php
arch('controllers are thin')->expect('App\Http\Controllers')->not->toUse('Illuminate\Database\Eloquent\Model');
arch('services do not return responses')->expect('App\Services')->not->toUse('Illuminate\Http\Response');
arch('no legacy kernels in new code')->expect('App\Services')->not->toUse('App\Mail\MailApi');
arch('services use storage abstraction')->expect('App\Services')->not->toUse('App\Paths');
```

## Mail

Assert `{ error, message }` shape where contract requires it.

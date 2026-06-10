---
name: dev-environment
description: Local dev setup, Docker, Storybook proxy, HTTPS/WebDAV, and troubleshooting for the WeGotWorkspace monorepo. Use when dev servers fail, ports conflict, or live Storybook/API integration breaks.
---

# Dev environment

Canonical layout: [`docs/dev-layout.md`](../../../docs/dev-layout.md). Env files: [`docs/env.md`](../../../docs/env.md). Docker detail: [`docker/README.md`](../../../docker/README.md).

## Default workflow

```bash
pnpm docker:up          # API → http://127.0.0.1:9080
pnpm dev:ui             # Storybook → http://127.0.0.1:6006, Vite watch → packages/apps/dist
```

| Service | URL | Notes |
|---------|-----|-------|
| API (Docker) | http://127.0.0.1:9080 | Health: `/api/v1/health` |
| Storybook | http://127.0.0.1:6006 | Proxies `/api/v1` to `:9080` |
| HTTPS + WebDAV | https://wegotworkspace.localhost/ | Requires `compose.local.yml` + mkcert — see below |

**Edit paths:** `packages/api` (Laravel), `packages/apps` (UI source → `dist/`). Install shell `apps/wegotworkspace` is config/data only — not a second codebase.

## Host PHP (no Docker)

```bash
pnpm dev          # API :9080 + UI + Storybook + typegen watch
pnpm dev:api      # API only
pnpm dev:ui       # UI only — start API separately
```

## Production-like install tree

`pnpm dev:preview` or `pnpm build` syncs into `apps/wegotworkspace/packages/` — use for install-path edge cases only.

## HTTPS + WebDAV (optional)

```bash
brew services stop httpd    # if host Apache binds 80/443
pnpm docker:ssl:setup
docker compose -f compose.dev.yml -f compose.local.yml up -d --build
```

Open **https://wegotworkspace.localhost/** (port 443). Plain HTTP dev API stays on **9080** without `/etc/hosts`.

## After API schema pulls

```bash
docker compose -f compose.dev.yml exec web php /var/www/packages/api/artisan wgw:schema-migrate
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Storybook **`Live …`** stories fail | API not running | `pnpm docker:up`; optional `pnpm setup:storybook-live-api`; restart Storybook |
| Mock-tier stories fail | Unrelated to API — check story mocks | Use `@/lib/api/mock/*-bootstrap`; see [storybook/offline-first.md](../storybook/offline-first.md) |
| `9080` connection refused | Docker stack down or wrong port | `docker compose -f compose.dev.yml up -d --build`; check `WGW_DOCKER_HTTP_PORT` |
| Storybook `/api/v1` errors on live tier | Proxy target down | Ensure API health OK at http://127.0.0.1:9080/api/v1/health |
| HTTPS cert warnings | mkcert not installed | `pnpm docker:ssl:setup`; trust mkcert CA |
| Port 80/443 in use | Host Apache/nginx | `brew services stop httpd` (see docker README) |
| MySQL from container can't reach host DB | `127.0.0.1` is container-local | Use **`host.docker.internal`** as DB host from Docker |
| Missing tables after pull | Pending WGW migration | `wgw:schema-migrate` (see above) |
| UI stale in browser | `dist/` not rebuilt | `pnpm dev:ui` watches; or `pnpm --filter @wgw/apps run build:dev` |
| Type errors after OpenAPI change | Types not regenerated | `pnpm --filter @wgw/api run openapi:build-json` + apps typegen |

## API e2e (local, not default CI for apps)

```bash
pnpm test:api-e2e:docker
```

Uses `compose.ci.yml` — HTTP on `:9080` only.

## Verification before PR

See [developer/done-checklist.md](../developer/done-checklist.md) and `pnpm run ci:quality`.

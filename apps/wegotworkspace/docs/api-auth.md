# API Auth Quickstart

The `/api/v1` endpoints use bearer JWT tokens signed with RS256.

## 1) Generate signing keys (local/dev)

From `apps/wegotworkspace`:

```bash
pnpm run generate:api-jwt-keys
```

This creates:

- `wgw-content/keys/api-jwt-private.pem`
- `wgw-content/keys/api-jwt-public.pem`

By default, the API reads those paths automatically. You can override with env/config constants:

- `WGW_API_JWT_PRIVATE_KEY` or `WGW_API_JWT_PRIVATE_KEY_PATH`
- `WGW_API_JWT_PUBLIC_KEY` or `WGW_API_JWT_PUBLIC_KEY_PATH`
- `WGW_API_JWT_ISSUER`, `WGW_API_JWT_AUDIENCE`, `WGW_API_JWT_KID`
- Optional rollover:
  - `WGW_API_JWT_PREVIOUS_KID`
  - `WGW_API_JWT_PREVIOUS_PUBLIC_KEY` or `WGW_API_JWT_PREVIOUS_PUBLIC_KEY_PATH`

## 2) Request a token

```bash
curl -k -X POST "https://wegotworkspace.local:8443/api/v1/auth/token" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON'
{
  "username": "admin",
  "password": "YOUR_PASSWORD"
}
JSON
```

Expected success fields:

- `access_token`
- `refresh_token`
- `token_type` (`Bearer`)
- `expires_in`
- `role`
- `username`

## 3) Use the token

```bash
TOKEN="PASTE_ACCESS_TOKEN"
curl -k "https://wegotworkspace.local:8443/api/v1/me" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "accept: application/json"
```

## 4) Refresh and revoke

Refresh:

```bash
curl -k -X POST "https://wegotworkspace.local:8443/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  --data '{"refresh_token":"PASTE_REFRESH_TOKEN"}'
```

Revoke current access token and optionally a refresh token:

```bash
curl -k -X POST "https://wegotworkspace.local:8443/api/v1/auth/revoke" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"refresh_token":"PASTE_REFRESH_TOKEN"}'
```

## 5) Verify via JWKS

Public keys are exposed at:

```text
/api/v1/.well-known/jwks.json
```

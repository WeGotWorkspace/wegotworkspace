# API auth

## Wire contract (parity)

- RS256 bearer + refresh rotation; same JSON keys as OpenAPI `AuthTokenResponse`
- Endpoints: `auth/token`, `auth/session`, `auth/refresh`, `auth/revoke`, `me`, `/.well-known/jwks.json`

## Implementation (greenfield)

- Auth logic in injectable services + Eloquent/`users` + `principals` — not static `ApiAuth` + `\PDO`
- Rate-limit login in service layer
- Roles: `guest` | `user` | `admin`

## Do not

- Reintroduce `WgwRuntime` to populate `$_SERVER` for auth
- Copy `ApiAuth` / `ApiRevocationStore` verbatim without Laravel wiring

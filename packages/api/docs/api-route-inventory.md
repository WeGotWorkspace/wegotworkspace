# `/api/v1` Route Inventory

Current REST surface and access levels.

## Auth + System

| Route | Access | Notes |
|---|---|---|
| `POST /api/v1/auth/token` | guest | Issues RS256 bearer token after Sabre credential validation. |
| `GET /api/v1/me` | user/admin | Returns current principal from bearer token. |
| `GET /api/v1/health` | guest | API health. |
| `GET /api/v1/capabilities` | guest | Domain and auth capability discovery. |
| `GET /api/v1/.well-known/jwks.json` | guest | Public JWKS for JWT verification. |

## Admin

| Route | Access |
|---|---|
| `GET /api/v1/admin/state` | admin |
| `POST /api/v1/admin/users` | admin |
| `PATCH /api/v1/admin/users/{username}` | admin |
| `DELETE /api/v1/admin/users/{username}` | admin |
| `POST /api/v1/admin/groups` | admin |
| `PATCH /api/v1/admin/groups/{group}` | admin |
| `DELETE /api/v1/admin/groups/{group}` | admin |
| `PUT /api/v1/admin/groups/{group}/members/{username}` | admin |
| `PUT /api/v1/admin/settings` | admin |
| `GET /api/v1/admin/updates/state` | admin |
| `GET /api/v1/admin/updates/log` | admin |
| `POST /api/v1/admin/updates/check` | admin |
| `POST /api/v1/admin/updates/apply` | admin |
| `POST /api/v1/admin/updates/cancel` | admin |

## User Settings

| Route | Access |
|---|---|
| `GET /api/v1/settings/state` | user/admin |
| `PUT /api/v1/settings/profile` | user/admin |
| `PUT /api/v1/settings/mail` | user/admin |

## Mail

| Route | Access |
|---|---|
| `GET /api/v1/mail/status` | user/admin |
| `GET /api/v1/mail/config` | user/admin |
| `PUT /api/v1/mail/config` | user/admin |
| `GET /api/v1/mail/folders` | user/admin |
| `GET /api/v1/mail/messages` | user/admin |
| `GET /api/v1/mail/messages/{id}` | user/admin |
| `PATCH /api/v1/mail/messages/{id}` | user/admin |
| `POST /api/v1/mail/messages/{id}/move` | user/admin |
| `POST /api/v1/mail/send` | user/admin |
| `POST /api/v1/mail/drafts` | user/admin |

## Drive

| Route | Access |
|---|---|
| `GET /api/v1/drive/user` | user/admin |
| `POST /api/v1/drive/directories/read` | user/admin |
| `POST /api/v1/drive/search` | user/admin |
| `POST /api/v1/drive/directories/change` | user/admin |
| `POST /api/v1/drive/directories` | user/admin |
| `PATCH /api/v1/drive/items/rename` | user/admin |
| `DELETE /api/v1/drive/items` | user/admin |
| `GET /api/v1/drive/download` | user/admin |
| `POST /api/v1/drive/upload` | user/admin |

## Voice

| Route | Access |
|---|---|
| `POST /api/v1/voice/join` | guest/user/admin |
| `POST /api/v1/voice/poll` | guest/user/admin |
| `POST /api/v1/voice/send` | guest/user/admin |
| `POST /api/v1/voice/leave` | guest/user/admin |
| `POST /api/v1/voice/chat` | guest/user/admin |

## Notes + Plugins + Home + Installer + DAV

| Domain | Routes | Access |
|---|---|---|
| notes | `GET /api/v1/notes/capabilities` | user/admin |
| plugins | `GET /api/v1/plugins`, `POST /api/v1/plugins/{id}/session` | user/admin |
| home | `GET /api/v1/home/state` | user/admin |
| installer | `GET /api/v1/installer/state`, `POST /api/v1/installer/action` | guest/admin |
| dav | `GET /api/v1/dav/capabilities` | user/admin |

## Role Matrix

- `guest`: health/capabilities/auth token/jwks + guest voice + installer bootstrap paths.
- `user`: all user-owned app endpoints.
- `admin`: all user endpoints + admin namespace.

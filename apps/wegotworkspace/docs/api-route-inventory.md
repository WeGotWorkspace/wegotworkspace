# Legacy To `/api/v1` Route Inventory

This document maps existing routes to the new OpenAPI REST surface and classifies access level.

## Auth + System

| Legacy | New | Access | Notes |
|---|---|---|---|
| `/login/` + Basic auth | `POST /api/v1/auth/token` | guest | Issues RS256 bearer token after Sabre credential validation. |
| _(none)_ | `GET /api/v1/me` | user/admin | Returns current principal from bearer token. |
| _(none)_ | `GET /api/v1/health` | guest | API health. |
| _(none)_ | `GET /api/v1/capabilities` | guest | Domain and auth capability discovery. |
| _(none)_ | `GET /api/v1/.well-known/jwks.json` | guest | Public JWKS for JWT verification. |

## Admin

| Legacy | New | Access |
|---|---|---|
| `GET /admin/api/state` | `GET /api/v1/admin/state` | admin |
| `POST /admin/api/users/create` | `POST /api/v1/admin/users` | admin |
| `POST /admin/api/users/update` | `PATCH /api/v1/admin/users/{username}` | admin |
| `POST /admin/api/users/delete` | `DELETE /api/v1/admin/users/{username}` | admin |
| `POST /admin/api/groups/create` | `POST /api/v1/admin/groups` | admin |
| `POST /admin/api/groups/update` | `PATCH /api/v1/admin/groups/{group}` | admin |
| `POST /admin/api/groups/delete` | `DELETE /api/v1/admin/groups/{group}` | admin |
| `POST /admin/api/membership/set` | `PUT /api/v1/admin/groups/{group}/members/{username}` | admin |
| `POST /admin/api/settings/save` | `PUT /api/v1/admin/settings` | admin |
| `GET /admin/api/updates/state` | `GET /api/v1/admin/updates/state` | admin |
| `GET /admin/api/updates/log` | `GET /api/v1/admin/updates/log` | admin |
| `POST /admin/api/updates/check` | `POST /api/v1/admin/updates/check` | admin |
| `POST /admin/api/updates/apply` | `POST /api/v1/admin/updates/apply` | admin |
| `POST /admin/api/updates/cancel` | `POST /api/v1/admin/updates/cancel` | admin |

## User Settings

| Legacy | New | Access |
|---|---|---|
| `GET /settings/api/state` | `GET /api/v1/settings/state` | user/admin |
| `POST /settings/api/profile/save` | `PUT /api/v1/settings/profile` | user/admin |
| `POST /settings/api/mail/save` | `PUT /api/v1/settings/mail` | user/admin |

## Mail

| Legacy | New | Access |
|---|---|---|
| `GET /mail/api/status` | `GET /api/v1/mail/status` | user/admin |
| `GET /mail/api/config` | `GET /api/v1/mail/config` | user/admin |
| `PUT /mail/api/config` | `PUT /api/v1/mail/config` | user/admin |
| `GET /mail/api/folders` | `GET /api/v1/mail/folders` | user/admin |
| `GET /mail/api/messages` | `GET /api/v1/mail/messages` | user/admin |
| `GET /mail/api/message` | `GET /api/v1/mail/messages/{id}` | user/admin |
| `PATCH /mail/api/message` | `PATCH /api/v1/mail/messages/{id}` | user/admin |
| `POST /mail/api/move` | `POST /api/v1/mail/messages/{id}/move` | user/admin |
| `POST /mail/api/send` | `POST /api/v1/mail/send` | user/admin |
| `POST /mail/api/draft` | `POST /api/v1/mail/drafts` | user/admin |

## Drive

| Legacy | New | Access |
|---|---|---|
| `GET /drive/?r=/getuser` | `GET /api/v1/drive/user` | user/admin |
| `POST /drive/?r=/getdir` | `POST /api/v1/drive/directories/read` | user/admin |
| `POST /drive/?r=/searchfiles` | `POST /api/v1/drive/search` | user/admin |
| `POST /drive/?r=/changedir` | `POST /api/v1/drive/directories/change` | user/admin |
| `POST /drive/?r=/createnew` | `POST /api/v1/drive/directories` | user/admin |
| `POST /drive/?r=/renameitem` | `PATCH /api/v1/drive/items/rename` | user/admin |
| `POST /drive/?r=/deleteitems` | `DELETE /api/v1/drive/items` | user/admin |
| `GET /drive/?r=/download` | `GET /api/v1/drive/download` | user/admin |
| `POST /drive/?r=/upload` | `POST /api/v1/drive/upload` | user/admin |

## Voice

| Legacy | New | Access |
|---|---|---|
| `POST /voice/aura-signaling/rooms.php?action=join` | `POST /api/v1/voice/join` | guest/user/admin |
| `POST /voice/aura-signaling/rooms.php?action=poll` | `POST /api/v1/voice/poll` | guest/user/admin |
| `POST /voice/aura-signaling/rooms.php?action=send` | `POST /api/v1/voice/send` | guest/user/admin |
| `POST /voice/aura-signaling/rooms.php?action=leave` | `POST /api/v1/voice/leave` | guest/user/admin |
| `POST /voice/aura-signaling/rooms.php?action=chat` | `POST /api/v1/voice/chat` | guest/user/admin |

## Notes + Office + Home + Installer + DAV

| Domain | Legacy | New | Access |
|---|---|---|---|
| notes | `/notes/` boot config is server-injected | `GET /api/v1/notes/capabilities` | user/admin |
| office | `/office/` + `/office/editor` server-injected config | `GET /api/v1/office/capabilities` | user/admin |
| home | `/` injected home app config | `GET /api/v1/home/state` | user/admin |
| installer | `/install/api/bootstrap`, `/install/api/action` | `GET /api/v1/installer/state`, `POST /api/v1/installer/action` | guest/admin |
| dav | SabreDAV fallback + `/.well-known/*dav` redirects | `GET /api/v1/dav/capabilities` | user/admin |

## Role Matrix

- `guest`: health/capabilities/auth token/jwks + guest voice + installer bootstrap paths.
- `user`: all user-owned app endpoints.
- `admin`: all user endpoints + admin namespace.

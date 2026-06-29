# Browser tab titles

Workspace apps share one pattern for `document.title` so browser tabs reflect the same context as in-app headers.

## Format

`{context} | WeGotWorkspace` — one primary segment (the most specific header label), plus brand suffix. Blank context → `WeGotWorkspace` only.

## Shared modules

`packages/apps/src/lib/document-title/`:

| Export | Role |
|--------|------|
| `formatBrowserTitle(context?)` | Pure formatter |
| `fileNameToBrowserTitle(fileName)` | Strip extension via `splitFileNameForRename()` |
| `useDocumentTitle(title?)` | React hook; Storybook-safe; restores previous title on unmount |

## Integration rules

| Rule | Detail |
|------|--------|
| Reuse header strings | Same derivation as `ViewHeader` / `DetailViewHeader` |
| Owner | `*App.tsx` when route branches; else `*Workspace.tsx` |
| Loading | Pass `undefined` while bootstrap phase ≠ success |
| Live updates | Derive from reactive controller state |

## Per-app context

| App | List / section | Detail / open item |
|-----|----------------|-------------------|
| Docs | `docsLabels.homeTitle` | `fileNameToBrowserTitle` (file basename) |
| Notes | `viewLabel` | `noteListTitle(active)` |
| Mail | `viewLabel` | message subject or `noSubject` label |
| Contacts | `viewLabel` | `displayName` |
| Drive | `viewLabel` or search title | — |
| Settings / Admin | `currentSection.label` | — |
| Install | `installStepTitle(step.id)` | — |
| Meet | `"Meet"` (lobby) | `roomCode` (in-room) |

Out of scope: login/home shell (`index.html` static title), favicon/PWA manifest.

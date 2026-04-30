# Minimal Office Editor

This repository is trimmed to a minimal setup that only boots the editor runtime.

There is no home page UI, sidebar, template library, settings panel, or other shell.
The root route now redirects directly to `/editor`.

## What remains

- ONLYOFFICE editor runtime integration
- Local in-browser document server and conversion flow
- `/editor` route (core entrypoint)
- Static assets required by the editor
- Strict format support: `docx`, `xlsx`, `pptx`, `pdf`

## Quick start

```bash
pnpm install
pnpm dev
```

Open:

- `http://localhost:3000` (redirects to `/editor`)
- `http://localhost:3000/editor`

## Query params supported by `/editor`

- `new=docx|xlsx|pptx|pdf` create a new document
- `url=<encoded-url>` open a remote file URL
- `fileType=docx|xlsx|pptx|pdf` force file type for URL mode
- `fileName=<name>` set display name for URL mode
- `lang=<locale>` set editor language
- `theme=<theme-name>` set editor UI theme
- `editing=0|1` read-only or edit mode

Any other file type is rejected at runtime.

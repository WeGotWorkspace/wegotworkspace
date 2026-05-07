# Mail Core Reuse Guide

`mail-core` exposes reusable building blocks for apps that need mail-style list/detail behavior.

## Reusable exports

- `MailWorkspace` (`src/mail-core/src/mail-workspace.tsx`)
- `useMailController` (`src/mail-core/src/use-mail-controller.tsx`)
- `MailAPIOperations`, `MailUIData`, `MailboxSummary`, and `MailMailboxLoader` (`src/mail-core/src/mail-types.ts`)
- View composition pieces (`src/mail-core/src/mail-view-composition.ts`)
  - `MailListPanel`
  - `MailDetailActionBar`
  - `MailDetailView`
  - `MailAttachments`
  - `MultiSelectionView`

## Provider wiring

Implement `MailAPIOperations` for your backend and pass it into `MailWorkspace` (directly or via your own API hook).

This lets each app swap backend providers while reusing the same controller/UI behavior.

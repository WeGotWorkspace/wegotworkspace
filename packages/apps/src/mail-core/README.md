# Mail Core Reuse Guide

`mail-core` exposes reusable building blocks for apps that need mail-style list/detail behavior.

## Reusable exports

- `MailWorkspace` (`src/mail-core/src/mail-workspace.tsx`)
- `useMailController` (`src/mail-core/src/use-mail-controller.tsx`)
- `MailAPIOperations`, `MailUIData`, `MailboxSummary`, and `MailMailboxLoader` (`src/mail-core/src/mail-types.ts`)
- View composition pieces:
  - `MailListPanel`
  - `MailDetailActionBar`
  - `MailDetailView`
  - `MailComposeView`
  - `MailAttachments`
  - `MultiSelectionView`

## Provider wiring

Implement `MailAPIOperations` for your backend and pass it into `MailWorkspace` (directly or via your own API hook).

This lets each app swap backend providers while reusing the same controller/UI behavior.

## Styling

Pane and detail styling lives under `.mail-workspace` in `mail-workspace.css`, with class name fragments in `mail-workspace.styles.ts`. Storybook decorators should apply the `mail-workspace` root class so descendant CSS applies.

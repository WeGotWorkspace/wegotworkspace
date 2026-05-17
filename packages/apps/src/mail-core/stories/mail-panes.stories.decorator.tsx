import type { ReactElement } from "react";
import "@/mail-core/src/mail-workspace.css";

/** Centered pane width for attachments and similar surfaces. */
export function mailPaneDecorator(Story: () => ReactElement) {
  return (
    <div
      className="mail-workspace"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--workspace-root-bg, var(--color-paper))",
      }}
    >
      <div className="mx-auto max-w-2xl p-6 md:p-10">
        <Story />
      </div>
    </div>
  );
}

/** Fixed list-column width to match {@link CollectionListWorkspace} / mail shell. */
export function mailListColumnDecorator(Story: () => ReactElement) {
  return (
    <div
      className="mail-workspace flex min-h-dvh justify-center"
      style={{
        backgroundColor: "var(--workspace-root-bg, var(--color-paper))",
      }}
    >
      <div className="h-dvh w-full max-w-md shrink-0 md:w-96">
        <Story />
      </div>
    </div>
  );
}

/** Detail column uses cream in production ({@link WorkspaceApp} detail pane). */
export function mailDetailPaneDecorator(Story: () => ReactElement) {
  return (
    <div
      className="mail-workspace"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-cream, #f5f1e8)",
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">
        <Story />
      </div>
    </div>
  );
}

/** Portaled compose dialog surface tokens (not under `.mail-workspace` in the DOM). */
export function mailComposeDialogDecorator(Story: () => ReactElement) {
  return (
    <div
      className="mail-compose-dialog-surface flex min-h-dvh items-center justify-center p-6"
      style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 20%, transparent)" }}
    >
      <div className="mail-compose-dialog mail-compose-dialog-surface flex max-h-[min(92dvh,56rem)] w-full max-w-[72rem] flex-col overflow-hidden rounded-lg border shadow-lg">
        <Story />
      </div>
    </div>
  );
}

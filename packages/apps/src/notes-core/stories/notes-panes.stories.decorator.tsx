import type { ReactElement } from "react";
import "@/notes-core/src/notes-workspace.css";

/** Centered pane width for list metadata and multi-select surfaces. */
export function notesPaneDecorator(Story: () => ReactElement) {
  return (
    <div
      className="notes-workspace"
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

/** Fixed list-column width to match {@link CollectionListWorkspace} / notes shell. */
export function notesListColumnDecorator(Story: () => ReactElement) {
  return (
    <div
      className="notes-workspace flex min-h-dvh justify-center"
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

/** Detail/editor column uses cream in production ({@link WorkspaceApp} detail pane). */
export function notesDetailPaneDecorator(Story: () => ReactElement) {
  return (
    <div
      className="notes-workspace"
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

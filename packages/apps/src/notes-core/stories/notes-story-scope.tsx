import type { ReactNode } from "react";
import "@/notes-core/src/notes-workspace.css";

export type NotesStoryScopeVariant = "pane" | "list-column" | "detail";

export function NotesStoryScope({
  children,
  variant = "pane",
}: {
  children: ReactNode;
  variant?: NotesStoryScopeVariant;
}) {
  if (variant === "list-column") {
    return (
      <div
        className="notes-workspace flex min-h-dvh justify-center"
        style={{ backgroundColor: "var(--workspace-root-bg, var(--color-paper))" }}
      >
        <div className="h-dvh w-full max-w-md shrink-0 md:w-96">{children}</div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div
        className="notes-workspace"
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--color-cream, #ffffff)",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">{children}</div>
      </div>
    );
  }

  return (
    <div
      className="notes-workspace"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--workspace-root-bg, var(--color-paper))",
      }}
    >
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}

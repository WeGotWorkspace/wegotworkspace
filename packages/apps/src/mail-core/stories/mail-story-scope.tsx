import type { ReactNode } from "react";
import "@/mail-core/src/mail-workspace.css";

export type MailStoryScopeVariant = "pane" | "list-column" | "detail" | "compose-dialog";

export function MailStoryScope({
  children,
  variant = "pane",
}: {
  children: ReactNode;
  variant?: MailStoryScopeVariant;
}) {
  if (variant === "list-column") {
    return (
      <div
        className="mail-workspace flex min-h-dvh justify-center"
        style={{ backgroundColor: "var(--workspace-root-bg, var(--color-paper))" }}
      >
        <div className="h-dvh w-full max-w-md shrink-0 md:w-96">{children}</div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div
        className="mail-workspace"
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--color-cream, #ffffff)",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">{children}</div>
      </div>
    );
  }

  if (variant === "compose-dialog") {
    return (
      <div
        className="mail-compose-dialog-surface flex min-h-dvh items-center justify-center p-6"
        style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 20%, transparent)" }}
      >
        <div className="mail-compose-dialog mail-compose-dialog-surface flex max-h-[min(92dvh,56rem)] w-full max-w-[72rem] flex-col overflow-hidden border shadow-lg rounded-[length:var(--control-radius)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mail-workspace"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--workspace-root-bg, var(--color-paper))",
      }}
    >
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}

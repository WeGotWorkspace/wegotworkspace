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
      <div className="mail-workspace mail-story-scope mail-story-scope--list-column">
        <div className="h-dvh w-full max-w-md shrink-0 md:w-96">{children}</div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="mail-workspace mail-story-scope mail-story-scope--detail">
        <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">{children}</div>
      </div>
    );
  }

  if (variant === "compose-dialog") {
    return (
      <div className="mail-story-scope mail-story-scope--compose-dialog flex min-h-dvh items-center justify-center p-6">
        <div className="mail-compose-dialog mail-compose-dialog-surface flex max-h-[min(92dvh,56rem)] w-full max-w-[72rem] flex-col overflow-hidden border shadow-lg rounded-[length:var(--control-radius)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="mail-workspace mail-story-scope">
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}

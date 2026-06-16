import type { ReactNode } from "react";
import "@/contacts-core/src/contacts-workspace.css";

export type ContactsStoryScopeVariant = "pane" | "list-column" | "detail";

export function ContactsStoryScope({
  children,
  variant = "pane",
}: {
  children: ReactNode;
  variant?: ContactsStoryScopeVariant;
}) {
  if (variant === "list-column") {
    return (
      <div className="contacts-workspace contacts-story-scope contacts-story-scope--list-column">
        <div className="h-dvh w-full max-w-md shrink-0 md:w-96">{children}</div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="contacts-workspace contacts-story-scope contacts-story-scope--detail">
        <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">{children}</div>
      </div>
    );
  }

  return (
    <div className="contacts-workspace contacts-story-scope">
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}

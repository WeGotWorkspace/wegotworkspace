import type { ReactNode } from "react";
import "@/tasks-core/src/tasks-workspace.css";

export type TasksStoryScopeVariant = "pane" | "list-column" | "detail";

export function TasksStoryScope({
  children,
  variant = "pane",
}: {
  children: ReactNode;
  variant?: TasksStoryScopeVariant;
}) {
  if (variant === "list-column") {
    return (
      <div className="tasks-workspace tasks-story-scope tasks-story-scope--list-column">
        <div className="h-dvh w-full max-w-md shrink-0 md:w-96">{children}</div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="tasks-workspace tasks-story-scope tasks-story-scope--detail">
        <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">{children}</div>
      </div>
    );
  }

  return (
    <div className="tasks-workspace tasks-story-scope">
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}

import type { DocsCommentThread } from "../docs-comments-types";

/** Include an in-progress draft thread in the sidebar/floating display list. */
export function mergeDraftThreadWithOpenThreads(
  threads: DocsCommentThread[],
  draftThread: DocsCommentThread | null | undefined,
): DocsCommentThread[] {
  if (!draftThread) return threads;
  if (threads.some((thread) => thread.id === draftThread.id)) return threads;
  return [...threads, draftThread];
}

export function formatRelativeTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

import type { Message } from "./mail-store";
import { stripHtmlForPreview } from "./mail-html";

/** Same ordering as {@link MessageList}: newest first in {@code messages}. */
export function messagesVisibleInFolderList({
  messages,
  selectedId,
  query,
  unreadOnly,
  serverSideSearch,
}: {
  messages: Message[];
  selectedId: string | null;
  query: string;
  unreadOnly: boolean;
  serverSideSearch: boolean;
}): Message[] {
  const scope =
    unreadOnly && !serverSideSearch
      ? messages.filter((m) => !m.read || (selectedId !== null && m.id === selectedId))
      : messages;
  if (serverSideSearch) return scope;
  const q = query.trim().toLowerCase();
  if (!q) return scope;
  return scope.filter((m) => {
    const previewPlain = stripHtmlForPreview(m.preview).toLowerCase();
    return (
      m.subject.toLowerCase().includes(q) ||
      m.from.name.toLowerCase().includes(q) ||
      m.from.email.toLowerCase().includes(q) ||
      previewPlain.includes(q)
    );
  });
}

/**
 * After removing {@code removedId}, which message should be focused next?
 * Prefer the next row in list order (older / further down), then the previous row.
 */
export function neighborMessageIdAfterRemove(
  orderedIds: string[],
  removedId: string,
): string | null {
  const i = orderedIds.indexOf(removedId);
  if (i === -1) return null;
  if (i + 1 < orderedIds.length) return orderedIds[i + 1];
  if (i - 1 >= 0) return orderedIds[i - 1];
  return null;
}

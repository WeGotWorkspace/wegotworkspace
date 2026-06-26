import { useMemo } from "react";
import * as awarenessProtocol from "y-protocols/awareness";
import * as Y from "yjs";
import { applyContentSeedToYDoc } from "@/text-editor-core/docs-collab/docs-collab-editor-surface";
import { TEXT_EDITOR_DEMO_MARKDOWN } from "@/text-editor-core/src/text-editor-fixtures";
import { trackChangesAuthorIdFromName } from "@/text-editor-core/src/text-editor-track-changes";

export type MockDocsCollabEditorSession = {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  user: { id: string; name: string; color: string };
};

export function createMockDocsCollabEditorSession(
  userName = "Alex",
  color = "#2563eb",
): MockDocsCollabEditorSession {
  const ydoc = new Y.Doc();
  applyContentSeedToYDoc(ydoc, TEXT_EDITOR_DEMO_MARKDOWN, "markdown");
  const awareness = new awarenessProtocol.Awareness(ydoc);
  const user = {
    id: trackChangesAuthorIdFromName(userName),
    name: userName,
    color,
  };
  awareness.setLocalStateField("user", user);
  return {
    ydoc,
    awareness,
    user,
  };
}

export function useMockDocsCollabEditorSession(
  userName = "Alex",
  color = "#2563eb",
): MockDocsCollabEditorSession {
  return useMemo(() => createMockDocsCollabEditorSession(userName, color), [userName, color]);
}

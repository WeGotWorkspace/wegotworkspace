import { useMemo } from "react";
import * as awarenessProtocol from "y-protocols/awareness";
import * as Y from "yjs";
import { applyContentSeedToYDoc } from "@/text-editor-core/docs-collab/docs-collab-editor-surface";
import { TEXT_EDITOR_DEMO_MARKDOWN } from "@/text-editor-core/src/text-editor-fixtures";

export type MockDocsCollabEditorSession = {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  user: { name: string; color: string };
};

export function createMockDocsCollabEditorSession(
  userName = "Alex",
  color = "#2563eb",
): MockDocsCollabEditorSession {
  const ydoc = new Y.Doc();
  applyContentSeedToYDoc(ydoc, TEXT_EDITOR_DEMO_MARKDOWN, "markdown");
  const awareness = new awarenessProtocol.Awareness(ydoc);
  awareness.setLocalStateField("user", { name: userName, color });
  return {
    ydoc,
    awareness,
    user: { name: userName, color },
  };
}

export function useMockDocsCollabEditorSession(
  userName = "Alex",
  color = "#2563eb",
): MockDocsCollabEditorSession {
  return useMemo(() => createMockDocsCollabEditorSession(userName, color), [userName, color]);
}

import * as Y from "yjs";
import { loadYjsSnapshot } from "@/text-editor-core/docs-collab/docs-collab-server-io";
import { SERVER_ORIGIN } from "@/text-editor-core/docs-collab/docs-collab-utils";

export async function resolveDocsConflictUseServer(
  ydoc: Y.Doc,
  yjsUrl: string,
  authToken: string | undefined,
): Promise<boolean> {
  return loadYjsSnapshot(yjsUrl, ydoc, authToken, SERVER_ORIGIN);
}

export async function resolveDocsConflictKeepLocal(saveNow: () => Promise<void>): Promise<void> {
  await saveNow();
}

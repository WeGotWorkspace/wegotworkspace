import { notesMockAdapter } from "@/lib/adapters/mock/notes-mock-adapter";
import type { NotesSeedData } from "@/lib/adapters/notes-adapter";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

import { mockWorkspaceSession } from "./workspace-session-mock";

export type NotesAppBootstrap = {
  data: NotesSeedData;
  session: WorkspaceSession;
};

export function createNotesAppBootstrap(overrides?: {
  data?: NotesSeedData;
  session?: WorkspaceSession;
}): NotesAppBootstrap {
  return {
    data: overrides?.data ?? notesMockAdapter.getSeedData(),
    session: overrides?.session ?? mockWorkspaceSession,
  };
}

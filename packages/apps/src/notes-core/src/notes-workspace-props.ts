import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { NotesUILabels } from "@/notes-core/src/notes-app.stories.fixtures";
import type { NotesAPIOperations, NotesUIData } from "@/notes-core/src/notes-types";

export type NotesWorkspaceProps = {
  data: NotesUIData;
  session: WorkspaceSession;
  labels?: Partial<NotesUILabels>;
  /** Optional async backend operations for notes mutations. */
  operations?: NotesAPIOperations;
  /** Show list-column spinner while notes bootstrap (shell + sidebar visible). */
  listLoading?: boolean;
  /** Logout link target, or `false` to omit navigation (e.g. Storybook). Default `/`. */
  logoutTo?: string | false;
};

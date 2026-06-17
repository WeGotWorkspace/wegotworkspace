import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { NotesUILabels } from "@/notes-core/src/notes-labels";
import type { NotesAPIOperations, NotesUIData } from "@/notes-core/src/notes-types";

export type NotesWorkspaceProps = {
  data: NotesUIData;
  session: WorkspaceSession;
  labels?: Partial<NotesUILabels>;
  /** Optional async backend operations for notes mutations. */
  operations?: NotesAPIOperations;
  /** Show list-column spinner while notes bootstrap (shell + sidebar visible). */
  listLoading?: boolean;
  /** Refresh cached bootstrap after reconnect or conflict resolution. */
  onRefreshList?: () => void;
  /** Invoked when the user chooses log out; navigation is owned by the app shell. */
  onLogout?: () => void;
  className?: string;
};

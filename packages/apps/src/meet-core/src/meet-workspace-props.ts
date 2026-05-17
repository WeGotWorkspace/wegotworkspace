import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { MeetAPIOperations, MeetUIData } from "@/meet-core/src/meet-types";

export type MeetWorkspaceProps = {
  data: MeetUIData;
  session: WorkspaceSession;
  operations?: MeetAPIOperations;
  listLoading?: boolean;
  /** Invoked when the user chooses log out; navigation is owned by the app shell. */
  onLogout?: () => void;
  className?: string;
};

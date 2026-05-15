import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { AdminAPIOperations, AdminUIData } from "@/admin-core/src/admin-types";

export type AdminWorkspaceProps = {
  data: AdminUIData;
  session: WorkspaceSession;
  operations?: AdminAPIOperations;
  listLoading?: boolean;
  /** Invoked when the user chooses log out; navigation is owned by the app shell. */
  onLogout?: () => void;
  className?: string;
};

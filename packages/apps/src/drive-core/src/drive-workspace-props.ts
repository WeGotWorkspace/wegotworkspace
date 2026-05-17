import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type DriveWorkspaceProps = {
  data: DriveUIData;
  session: WorkspaceSession;
  operations?: DriveAPIOperations;
  listLoading?: boolean;
  onLogout?: () => void;
  className?: string;
};

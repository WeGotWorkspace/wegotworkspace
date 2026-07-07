import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { TasksAPIOperations, TasksUIData } from "@/tasks-core/src/tasks-types";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";

export type TasksWorkspaceProps = {
  data: TasksUIData;
  session: WorkspaceSession;
  labels?: Partial<TasksUILabels>;
  operations?: TasksAPIOperations;
  listLoading?: boolean;
  bootstrapRevision?: number;
  onRefreshList?: () => void;
  onLogout?: () => void;
  className?: string;
  initialView?: string;
  onViewChange?: (view: string) => void;
};

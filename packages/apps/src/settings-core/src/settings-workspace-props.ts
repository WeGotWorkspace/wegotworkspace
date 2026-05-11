import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { SettingsAPIOperations, SettingsUIData } from "@/settings-core/src/settings-types";

export type SettingsWorkspaceProps = {
  data: SettingsUIData;
  session: WorkspaceSession;
  operations?: SettingsAPIOperations;
  listLoading?: boolean;
  logoutTo?: string | false;
};

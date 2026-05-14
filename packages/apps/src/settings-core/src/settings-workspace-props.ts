import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { SettingsAPIOperations, SettingsUIData } from "@/settings-core/src/settings-types";

export type SettingsWorkspaceProps = {
  data: SettingsUIData;
  session: WorkspaceSession;
  operations?: SettingsAPIOperations;
  listLoading?: boolean;
  /** Invoked when the user chooses log out; navigation is owned by the app shell. */
  onLogout?: () => void;
  className?: string;
};

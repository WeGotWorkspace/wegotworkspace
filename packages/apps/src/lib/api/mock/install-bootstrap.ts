import type { InstallWorkspaceProps } from "@/install-core/src/install-workspace-props";
import type { InstallAPIOperations, InstallUIData } from "@/install-core/src/install-types";
import { createMockInstallOperations } from "@/lib/api/mock/install-mock-operations";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { WgwInstallerRuntimeState } from "@/lib/api/wgw";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type InstallWorkspaceBootstrap = Pick<
  InstallWorkspaceProps,
  "data" | "operations" | "onInstallRedirect" | "onOpenAdmin"
>;

/** API bootstrap shape: workspace props plus session for `useWorkspaceApi` chrome parity. */
export type InstallAppBootstrap = InstallWorkspaceBootstrap & {
  session: WorkspaceSession;
};

const DEFAULT_INSTALLER_STATE: WgwInstallerRuntimeState = {
  step: "welcome",
  flash: null,
  already_installed: false,
  db_driver: "sqlite",
  db: {
    sqlite_path: "wgw-content/db.sqlite",
  },
  enable_files: true,
  enable_contacts: true,
  enable_calendars: true,
  timezone: "UTC",
  base_uri: "/",
  show_browser_ui: true,
  checks: [
    { label: "PHP version", ok: true, detail: "8.3" },
    { label: "Writable data directory", ok: true, detail: "wgw-content is writable" },
    { label: "cURL extension", ok: true, detail: "Available" },
    { label: "PDO SQLite", ok: true, detail: "Available" },
  ],
};

const DEFAULT_DATA: InstallUIData = {
  state: DEFAULT_INSTALLER_STATE,
};

export function createInstallAppBootstrap(overrides?: {
  data?: InstallUIData;
  operations?: InstallAPIOperations;
  onInstallRedirect?: InstallWorkspaceProps["onInstallRedirect"];
  onOpenAdmin?: InstallWorkspaceProps["onOpenAdmin"];
}): InstallAppBootstrap {
  const data = overrides?.data ?? DEFAULT_DATA;
  const seedState = data.state ?? DEFAULT_INSTALLER_STATE;
  return {
    data,
    session: mockWorkspaceSession,
    operations: overrides?.operations ?? createMockInstallOperations(seedState),
    onInstallRedirect: overrides?.onInstallRedirect ?? (() => {}),
    onOpenAdmin: overrides?.onOpenAdmin ?? (() => {}),
  };
}

/** Story/workspace args without session — install chrome uses step progress, not user footer. */
export function createInstallWorkspaceStoryArgs(
  overrides?: Parameters<typeof createInstallAppBootstrap>[0],
): InstallWorkspaceBootstrap {
  const { session: _session, ...workspaceArgs } = createInstallAppBootstrap(overrides);
  return workspaceArgs;
}

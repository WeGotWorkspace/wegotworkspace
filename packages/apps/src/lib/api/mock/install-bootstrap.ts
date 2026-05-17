import type { InstallWorkspaceProps } from "@/install-core/src/install-workspace-props";
import type { InstallAPIOperations, InstallUIData } from "@/install-core/src/install-types";
import { createMockInstallOperations } from "@/lib/api/mock/install-mock-operations";
import type { WgwInstallerRuntimeState } from "@/lib/api/wgw";

export type InstallAppBootstrap = Pick<
  InstallWorkspaceProps,
  "data" | "operations" | "onInstallRedirect" | "onOpenAdmin"
>;

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
    operations: overrides?.operations ?? createMockInstallOperations(seedState),
    onInstallRedirect: overrides?.onInstallRedirect ?? (() => {}),
    onOpenAdmin: overrides?.onOpenAdmin ?? (() => {}),
  };
}

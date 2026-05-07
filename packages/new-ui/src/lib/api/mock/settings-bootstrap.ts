import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { SettingsUIData } from "@/settings-core/src/settings-types";

export type SettingsAppBootstrap = {
  data: SettingsUIData;
  session: WorkspaceSession;
};

const DEFAULT_DATA: SettingsUIData = {
  user: {
    username: "elias.linden",
    displayName: "Elias Linden",
    email: "elias@northlight.studio",
  },
  groups: [
    { id: "principals/groups/editorial", displayName: "Editorial Team" },
    { id: "principals/groups/studio", displayName: "Studio Crew" },
    { id: "principals/groups/northlight", displayName: "Northlight Project" },
    { id: "principals/groups/bindery", displayName: "Bindery Workshop" },
  ],
  mail: {
    imapUsername: "elias@northlight.studio",
    imapHasPassword: true,
  },
  mailServer: {
    imapHost: "imap.northlight.studio",
    imapPort: 993,
    imapSecurity: "ssl",
    smtpHost: "smtp.northlight.studio",
    smtpPort: 465,
    smtpSecurity: "ssl",
  },
  logoutUrl: "/",
};

export function createSettingsAppBootstrap(overrides?: {
  data?: SettingsUIData;
  session?: WorkspaceSession;
}): SettingsAppBootstrap {
  return {
    data: overrides?.data ?? DEFAULT_DATA,
    session: overrides?.session ?? mockWorkspaceSession,
  };
}

import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { AdminUIData, AdminUpdateCheck } from "@/admin-core/src/admin-types";

const DEFAULT_SERVER_CHECKS: AdminUpdateCheck[] = [
  { ok: true, label: "PHP runtime", detail: "Meets minimum version for this release." },
  { ok: true, label: "Database", detail: "Schema and migrations are consistent." },
  { ok: true, label: "Disk space", detail: "Enough free space for updates and backups." },
];

export type AdminAppBootstrap = {
  data: AdminUIData;
  session: WorkspaceSession;
};

const DEFAULT_DATA: AdminUIData = {
  users: [
    {
      id: "alice",
      username: "alice",
      email: "alice@example.test",
      displayName: "Alice Example",
      groups: ["principals/groups/administrators"],
      createdAt: "",
    },
  ],
  groups: [
    {
      id: "principals/groups/administrators",
      name: "administrators",
      displayName: "Administrators",
    },
  ],
  mail: {
    imapHost: "imap.example.test",
    imapPort: 993,
    imapSecurity: "ssl",
    smtpHost: "smtp.example.test",
    smtpPort: 465,
    smtpSecurity: "ssl",
  },
  voice: {
    signalingUrl: "",
    stunUrls: "",
    turnUrls: "",
    turnUsername: "",
    turnPassword: "",
    forceRelay: false,
  },
  apps: {
    calendars: true,
    contacts: true,
  },
  webdav: {
    sabreUi: true,
    timezone: "UTC",
    baseUri: "/",
    authRealm: "SabreDAV",
  },
  updates: {
    installedVersion: "0.0.0",
    schemaVersion: 0,
    latest: null,
    updateAvailable: false,
    compatible: true,
    backups: [],
    checks: DEFAULT_SERVER_CHECKS,
    inProgress: false,
    phase: null,
    current: null,
    download: null,
    phaseProgress: null,
    cancelRequested: false,
    cancelAllowed: false,
    lastCheckedAt: null,
    lastCheckError: null,
    lastResult: null,
  },
  currentUser: "",
  logoutUrl: "/logout",
  updateLogLines: [],
};

export function createAdminAppBootstrap(overrides?: {
  data?: AdminUIData;
  session?: WorkspaceSession;
}): AdminAppBootstrap {
  return {
    data: overrides?.data ?? DEFAULT_DATA,
    session: overrides?.session ?? mockWorkspaceSession,
  };
}

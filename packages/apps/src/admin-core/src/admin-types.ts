export type AdminSection =
  | "users"
  | "mail"
  | "collaboration"
  | "webdav"
  | "plugins"
  | "backups"
  | "updates";

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  groups: string[];
  createdAt: string;
};

export type AdminGroup = {
  id: string;
  name: string;
  displayName: string;
};

export type AdminMailSettings = {
  imapHost: string;
  imapPort: number;
  imapSecurity: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: string;
};

export type AdminVoiceSettings = {
  stunUrls: string;
  turnUrls: string;
  turnUsername: string;
  turnPassword: string;
  forceRelay: boolean;
};

export type AdminAppsSettings = {
  calendars: boolean;
  contacts: boolean;
};

export type AdminWebdavSettings = {
  sabreUi: boolean;
  timezone: string;
  baseUri: string;
  authRealm: string;
};

export type AdminUpdateRelease = {
  version: string;
  package_url: string;
  checksum_sha256: string;
  checksum_signature: string;
};

export type AdminUpdateBackupItem = {
  name: string;
  sizeBytes: number;
  modifiedAt: string | null;
  fromVersion: string | null;
  toVersion: string | null;
  format: string;
  downloadable: boolean;
};

export type AdminUpdateCheck = {
  ok: boolean;
  label: string;
  detail: string;
  status?: string;
};

export type AdminUpdateCurrent = {
  from: string;
  to: string;
  at: string;
};

export type AdminUpdateDownload = {
  downloadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
  updatedAt: string;
};

export type AdminUpdatePhaseProgress = {
  completed: number;
  total: number;
  percent: number;
  updatedAt: string;
};

export type AdminUpdateResult = {
  ok: boolean;
  version: string;
  message: string;
  finishedAt: string | null;
};

export type AdminUpdateState = {
  installedVersion: string;
  schemaVersion: number;
  latest: AdminUpdateRelease | null;
  updateAvailable: boolean;
  compatible: boolean;
  backups: AdminUpdateBackupItem[];
  checks: AdminUpdateCheck[];
  inProgress: boolean;
  phase: string | null;
  current: AdminUpdateCurrent | null;
  download: AdminUpdateDownload | null;
  phaseProgress: AdminUpdatePhaseProgress | null;
  cancelRequested: boolean;
  cancelAllowed: boolean;
  lastCheckedAt: string | null;
  lastCheckError: string | null;
  lastResult: AdminUpdateResult | null;
};

export type AdminUIData = {
  users: AdminUser[];
  groups: AdminGroup[];
  mail: AdminMailSettings;
  voice: AdminVoiceSettings;
  apps: AdminAppsSettings;
  webdav: AdminWebdavSettings;
  plugins: {
    id: string;
    name: string;
    active: boolean;
    source?: string;
  }[];
  updates: AdminUpdateState;
  currentUser: string;
  logoutUrl: string;
  updateLogLines: string[];
};

export type AdminAPIOperations = {
  refreshState: (opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  saveSettings: (
    values: Record<string, string | number | boolean | null>,
    opts?: { signal?: AbortSignal },
  ) => Promise<AdminUIData>;
  checkUpdates: (opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  refreshUpdateState: (opts?: { signal?: AbortSignal }) => Promise<AdminUpdateState>;
  applyUpdate: (version?: string, opts?: { signal?: AbortSignal }) => Promise<AdminUpdateState>;
  cancelUpdate: (opts?: { signal?: AbortSignal }) => Promise<AdminUpdateState>;
  refreshUpdateLog: (opts?: { signal?: AbortSignal }) => Promise<string[]>;
  clearUpdateLog: (opts?: { signal?: AbortSignal }) => Promise<string[]>;
  deleteBackup: (name: string, opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  downloadBackup: (name: string, opts?: { signal?: AbortSignal }) => Promise<void>;
  createBackup: (opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  createUser: (
    input: {
      username: string;
      password: string;
      displayName: string;
      email?: string;
      groups?: string[];
    },
    opts?: { signal?: AbortSignal },
  ) => Promise<AdminUIData>;
  updateUser: (
    username: string,
    input: { displayName?: string; email?: string; password?: string; groups?: string[] },
    opts?: { signal?: AbortSignal },
  ) => Promise<AdminUIData>;
  deleteUser: (username: string, opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  createGroup: (
    input: { name: string; displayName?: string },
    opts?: { signal?: AbortSignal },
  ) => Promise<AdminUIData>;
  updateGroup: (
    groupSlug: string,
    input: { displayName?: string; members?: string[] },
    opts?: { signal?: AbortSignal },
  ) => Promise<AdminUIData>;
  deleteGroup: (groupSlug: string, opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  activatePlugin: (pluginId: string, opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  deactivatePlugin: (pluginId: string, opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
  installPluginZip: (file: File, opts?: { signal?: AbortSignal }) => Promise<AdminUIData>;
};

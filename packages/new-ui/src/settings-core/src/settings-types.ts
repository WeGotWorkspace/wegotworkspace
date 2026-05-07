export type SettingsSection = "profile" | "memberships" | "mail";

export type SettingsSectionDescriptor = {
  id: SettingsSection;
  label: string;
  description: string;
};

export type SettingsUser = {
  username: string;
  displayName: string;
  email: string;
};

export type SettingsGroup = {
  id: string;
  displayName: string;
};

export type SettingsMailCredentials = {
  imapUsername: string;
  imapHasPassword: boolean;
};

export type SettingsMailServer = {
  imapHost: string;
  imapPort: number;
  imapSecurity: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: string;
};

export type SettingsUIData = {
  user: SettingsUser;
  groups: SettingsGroup[];
  mail: SettingsMailCredentials;
  mailServer: SettingsMailServer;
  logoutUrl: string;
};

export type SettingsAPIOperations = {
  saveProfile: (
    input: { displayName: string; email: string; password?: string },
    opts?: { signal?: AbortSignal },
  ) => Promise<SettingsUIData>;
  saveMail: (
    input: { imapUsername: string; imapPassword: string },
    opts?: { signal?: AbortSignal },
  ) => Promise<SettingsUIData>;
};

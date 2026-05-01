export type StepId =
  | "welcome"
  | "checks"
  | "database"
  | "site"
  | "mail"
  | "voice"
  | "account"
  | "success";

export interface InstallerData {
  database: {
    type: "sqlite" | "mysql";
    sqlitePath: string;
    mysql: {
      host: string;
      port: string;
      user: string;
      password: string;
      database: string;
    };
    tested: boolean;
  };
  site: {
    name: string;
    apps: { files: boolean; contacts: boolean; calendars: boolean };
  };
  mail: {
    enabled: boolean;
    imapHost: string;
    imapPort: string;
    imapSecurity: "none" | "starttls" | "ssl";
    smtpHost: string;
    smtpPort: string;
    smtpSecurity: "none" | "starttls" | "ssl";
  };
  voice: {
    enabled: boolean;
    stunUrl: string;
    turnUrl: string;
    turnUser: string;
    turnPassword: string;
  };
  account: {
    username: string;
    email: string;
    displayName: string;
    password: string;
  };
}

export type BackendStep =
  | "welcome"
  | "requirements"
  | "database"
  | "site"
  | "account"
  | "done"
  | "installed";

export interface InstallerCheck {
  ok: boolean;
  label: string;
  detail: string;
}

export interface BackendInstallerState {
  step: BackendStep;
  flash: string | null;
  db_driver: "sqlite" | "mysql";
  db: {
    sqlite_path?: string;
    mysql_host?: string;
    mysql_port?: number;
    mysql_db?: string;
    mysql_user?: string;
  };
  timezone: string;
  base_uri: string;
  enable_files: boolean;
  enable_calendars: boolean;
  enable_contacts: boolean;
  show_browser_ui: boolean;
  checks: InstallerCheck[];
  already_installed?: boolean;
  admin_updates_url?: string;
}

export const defaultData: InstallerData = {
  database: {
    type: "sqlite",
    sqlitePath: "wgw-content/db.sqlite",
    mysql: {
      host: "127.0.0.1",
      port: "3306",
      user: "",
      password: "",
      database: "",
    },
    tested: false,
  },
  site: {
    name: "WeGotWorkspace",
    apps: { files: true, contacts: true, calendars: true },
  },
  mail: {
    enabled: true,
    imapHost: "",
    imapPort: "993",
    imapSecurity: "ssl",
    smtpHost: "",
    smtpPort: "587",
    smtpSecurity: "starttls",
  },
  voice: {
    enabled: false,
    stunUrl: "stun:stun.l.google.com:19302",
    turnUrl: "",
    turnUser: "",
    turnPassword: "",
  },
  account: {
    username: "",
    email: "",
    displayName: "",
    password: "",
  },
};

export type BootstrapResponse = {
  state: BackendInstallerState;
};

export type ActionResponse = {
  ok: boolean;
  error?: string;
  flash?: string | null;
  redirect?: string;
  state?: BackendInstallerState;
};

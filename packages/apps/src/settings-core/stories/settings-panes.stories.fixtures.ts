import { createSettingsAppBootstrap } from "@/lib/api/mock/settings-bootstrap";
import type { SettingsGroup } from "@/settings-core/src/settings-types";
import type { SettingsControllerState } from "@/settings-core/src/use-settings-controller";

const asyncNoop = async () => {};

export function createMockProfile(
  overrides: Partial<SettingsControllerState["profile"]> = {},
): SettingsControllerState["profile"] {
  const { data } = createSettingsAppBootstrap();
  return {
    username: data.user.username,
    displayName: data.user.displayName,
    email: data.user.email,
    newPassword: "",
    confirmPassword: "",
    profileDirty: false,
    setDisplayName: () => {},
    setEmail: () => {},
    setNewPassword: () => {},
    setConfirmPassword: () => {},
    saveProfile: asyncNoop,
    ...overrides,
  };
}

export function createMockMail(
  overrides: Partial<SettingsControllerState["mail"]> = {},
): SettingsControllerState["mail"] {
  const { data } = createSettingsAppBootstrap();
  return {
    imapUsername: data.mail.imapUsername,
    imapPassword: "",
    mailDirty: false,
    imapHasPassword: data.mail.imapHasPassword,
    server: data.mailServer,
    setImapUsername: () => {},
    setImapPassword: () => {},
    saveMail: asyncNoop,
    ...overrides,
  };
}

export function createMockGroups(overrides?: SettingsGroup[]): SettingsGroup[] {
  return overrides ?? createSettingsAppBootstrap().data.groups;
}

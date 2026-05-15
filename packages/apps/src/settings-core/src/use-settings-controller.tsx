import type { SettingsWorkspaceProps } from "@/settings-core/src/settings-workspace-props";
import { useSettingsMailForm } from "@/settings-core/src/use-settings-mail-form";
import { useSettingsProfileForm } from "@/settings-core/src/use-settings-profile-form";
import { useSettingsShell } from "@/settings-core/src/use-settings-shell";

/**
 * Composes settings shell navigation with independent profile and mail form controllers
 * so each form can be reused outside this workspace.
 */
export function useSettingsController({
  data,
  operations,
}: Pick<SettingsWorkspaceProps, "data" | "operations">) {
  const shell = useSettingsShell();
  const profile = useSettingsProfileForm({ user: data.user, operations });
  const mail = useSettingsMailForm({
    mail: data.mail,
    mailServer: data.mailServer,
    operations,
  });

  return {
    ...shell,
    profile,
    memberships: data.groups,
    mail,
  };
}

export type SettingsControllerState = ReturnType<typeof useSettingsController>;

import { Input } from "@/ui/input";
import { Card } from "@/card/src/card";
import { settingsWorkspaceFormLayout } from "@/settings-core/src/settings-workspace-form-layout";
import type { SettingsControllerState } from "@/settings-core/src/use-settings-controller";
import { Form } from "@/ui/form";
import { FormDisplayField } from "@/ui/form-display-field";
import { FormSaveActionRow } from "@/ui/form-save-action-row";
import { FormTextField } from "@/ui/form-text-field";

export type SettingsProfilePaneProps = {
  profile: SettingsControllerState["profile"];
};

export function SettingsProfilePane({ profile }: SettingsProfilePaneProps) {
  const { form, username, saveProfile } = profile;
  const [newPasswordWatch, confirmPasswordWatch] = form.watch(["newPassword", "confirmPassword"]);

  const identityDisabled =
    !(form.formState.dirtyFields.displayName || form.formState.dirtyFields.email) &&
    !newPasswordWatch &&
    !confirmPasswordWatch;

  const passwordDisabled = !newPasswordWatch && !confirmPasswordWatch;

  return (
    <Form {...form}>
      <Card title="Identity">
        <FormDisplayField {...settingsWorkspaceFormLayout.displayField} label="Username" readOnly>
          <Input value={username} readOnly className="settings-workspace__input-readonly" />
        </FormDisplayField>
        <FormTextField
          {...settingsWorkspaceFormLayout.textField}
          name="displayName"
          label="Display name"
        />
        <FormTextField
          {...settingsWorkspaceFormLayout.textField}
          name="email"
          label="Email"
          type="email"
        />
        <FormSaveActionRow
          className={settingsWorkspaceFormLayout.saveActionRow}
          label="Save changes"
          disabled={identityDisabled}
          onSave={saveProfile}
        />
      </Card>

      <Card title="Password">
        <FormTextField
          {...settingsWorkspaceFormLayout.textField}
          name="newPassword"
          label="New password"
          type="password"
          placeholder="At least 8 characters"
        />
        <FormTextField
          {...settingsWorkspaceFormLayout.textField}
          name="confirmPassword"
          label="Confirm password"
          type="password"
        />
        <FormSaveActionRow
          className={settingsWorkspaceFormLayout.saveActionRow}
          label="Set password"
          disabled={passwordDisabled}
          onSave={saveProfile}
        />
      </Card>
    </Form>
  );
}

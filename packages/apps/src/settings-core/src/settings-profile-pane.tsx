import { Input } from "@/ui/input";
import { Button } from "@/button/src/button";
import { Card } from "@/card/src/card";
import { FormField as LegacyFormField } from "@/form-field/src/form-field";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import type { SettingsControllerState } from "@/settings-core/src/use-settings-controller";

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
        <LegacyFormField label="Username" readOnly>
          <Input value={username} readOnly className="settings-workspace__input-readonly" />
        </LegacyFormField>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem className="settings-workspace__form-field">
              <FormLabel className="settings-workspace__form-label">Display name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="settings-workspace__form-field">
              <FormLabel className="settings-workspace__form-label">Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="settings-workspace__form-actions">
          <Button
            type="button"
            onClick={() => void saveProfile()}
            disabled={identityDisabled}
            label="Save changes"
            variant="subtle"
            size="md"
          />
        </div>
      </Card>

      <Card title="Password">
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem className="settings-workspace__form-field">
              <FormLabel className="settings-workspace__form-label">New password</FormLabel>
              <FormControl>
                <Input type="password" {...field} placeholder="At least 8 characters" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem className="settings-workspace__form-field">
              <FormLabel className="settings-workspace__form-label">Confirm password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="settings-workspace__form-actions">
          <Button
            type="button"
            onClick={() => void saveProfile()}
            disabled={passwordDisabled}
            label="Set password"
            variant="subtle"
            size="md"
          />
        </div>
      </Card>
    </Form>
  );
}

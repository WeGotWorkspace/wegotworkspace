import { Input } from "@/ui/input";
import { Button } from "@/button/src/button";
import { Card } from "@/card/src/card";
import { FormField } from "@/form-field/src/form-field";
import type { SettingsControllerState } from "@/settings-core/src/use-settings-controller";

export type SettingsProfilePaneProps = {
  profile: SettingsControllerState["profile"];
};

export function SettingsProfilePane({ profile }: SettingsProfilePaneProps) {
  return (
    <>
      <Card title="Identity">
        <FormField label="Username" readOnly>
          <Input value={profile.username} readOnly className="settings-workspace__input-readonly" />
        </FormField>
        <FormField label="Display name">
          <Input
            value={profile.displayName}
            onChange={(event) => profile.setDisplayName(event.currentTarget.value)}
          />
        </FormField>
        <FormField label="Email">
          <Input
            type="email"
            value={profile.email}
            onChange={(event) => profile.setEmail(event.currentTarget.value)}
          />
        </FormField>
        <div className="settings-workspace__form-actions">
          <Button
            onClick={profile.saveProfile}
            disabled={!profile.profileDirty && !profile.newPassword && !profile.confirmPassword}
            label="Save changes"
            variant="subtle"
            size="md"
          />
        </div>
      </Card>

      <Card title="Password">
        <FormField label="New password">
          <Input
            type="password"
            value={profile.newPassword}
            onChange={(event) => profile.setNewPassword(event.currentTarget.value)}
            placeholder="At least 8 characters"
          />
        </FormField>
        <FormField label="Confirm password">
          <Input
            type="password"
            value={profile.confirmPassword}
            onChange={(event) => profile.setConfirmPassword(event.currentTarget.value)}
          />
        </FormField>
        <div className="settings-workspace__form-actions">
          <Button
            onClick={profile.saveProfile}
            disabled={!profile.newPassword && !profile.confirmPassword}
            label="Set password"
            variant="subtle"
            size="md"
          />
        </div>
      </Card>
    </>
  );
}

import { Mail as MailIcon } from "lucide-react";
import { Input } from "@/ui/input";
import { Card } from "@/card/src/card";
import { settingsWorkspaceFormLayout } from "@/settings-core/src/settings-workspace-form-layout";
import type { SettingsControllerState } from "@/settings-core/src/use-settings-controller";
import { Form } from "@/ui/form";
import { FormDisplayField } from "@/ui/form-display-field";
import { FormSaveActionRow } from "@/ui/form-save-action-row";
import { FormTextField } from "@/ui/form-text-field";

function securityLabel(security: string): string {
  if (!security) return "Unknown";
  if (security.toLowerCase() === "ssl") return "SSL/TLS";
  return security.toUpperCase();
}

export type SettingsMailPaneProps = {
  mail: SettingsControllerState["mail"];
};

export function SettingsMailPane({ mail }: SettingsMailPaneProps) {
  const { form, saveMail, imapHasPassword, server, savedImapUsername } = mail;
  const [imapUsernameWatch, imapPasswordWatch] = form.watch(["imapUsername", "imapPassword"]);

  const credentialsDirty = imapUsernameWatch !== savedImapUsername || imapPasswordWatch.length > 0;

  return (
    <>
      <Form {...form}>
        <Card title="Credentials">
          <FormTextField
            {...settingsWorkspaceFormLayout.textField}
            name="imapUsername"
            label="Username"
          />
          <FormTextField
            {...settingsWorkspaceFormLayout.textField}
            name="imapPassword"
            label="Password"
            type="password"
            placeholder={imapHasPassword ? "••••••••" : "Enter password"}
          />
          <FormSaveActionRow
            className={settingsWorkspaceFormLayout.saveActionRow}
            label="Save changes"
            disabled={!credentialsDirty}
            onSave={saveMail}
          />
        </Card>
      </Form>

      <Card title="IMAP (incoming)">
        <FormDisplayField
          {...settingsWorkspaceFormLayout.displayField}
          label="Server"
          readOnly
          icon={<MailIcon className="size-3.5 opacity-70" />}
        >
          <Input value={server.imapHost} readOnly className="settings-workspace__input-readonly" />
        </FormDisplayField>
        <div className="settings-workspace__grid-2">
          <FormDisplayField {...settingsWorkspaceFormLayout.displayField} label="Port" readOnly>
            <Input
              value={String(server.imapPort)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormDisplayField>
          <FormDisplayField {...settingsWorkspaceFormLayout.displayField} label="Security" readOnly>
            <Input
              value={securityLabel(server.imapSecurity)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormDisplayField>
        </div>
      </Card>

      <Card title="SMTP (outgoing)">
        <FormDisplayField
          {...settingsWorkspaceFormLayout.displayField}
          label="Server"
          readOnly
          icon={<MailIcon className="size-3.5 opacity-70" />}
        >
          <Input value={server.smtpHost} readOnly className="settings-workspace__input-readonly" />
        </FormDisplayField>
        <div className="settings-workspace__grid-2">
          <FormDisplayField {...settingsWorkspaceFormLayout.displayField} label="Port" readOnly>
            <Input
              value={String(server.smtpPort)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormDisplayField>
          <FormDisplayField {...settingsWorkspaceFormLayout.displayField} label="Security" readOnly>
            <Input
              value={securityLabel(server.smtpSecurity)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormDisplayField>
        </div>
      </Card>
    </>
  );
}

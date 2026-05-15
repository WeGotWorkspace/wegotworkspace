import { Input } from "@/ui/input";
import { Card } from "@/card/src/card";
import { formatMailTransportSecurityLabel } from "@/settings-core/src/settings-mail-display";
import { settingsWorkspacePaneClasses } from "@/settings-core/src/settings-workspace.styles";
import type { SettingsControllerState } from "@/settings-core/src/use-settings-controller";
import { Form } from "@/ui/form";
import { FieldLabelRow } from "@/ui/field-label-row";
import { FormSaveActionRow } from "@/ui/form-save-action-row";
import { FormTextField } from "@/ui/form-text-field";

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
            {...settingsWorkspacePaneClasses.formTextField}
            name="imapUsername"
            label="Username"
          />
          <FormTextField
            {...settingsWorkspacePaneClasses.formTextField}
            name="imapPassword"
            label="Password"
            type="password"
            placeholder={imapHasPassword ? "••••••••" : "Enter password"}
          />
          <FormSaveActionRow
            className={settingsWorkspacePaneClasses.saveActionRow}
            label="Save changes"
            disabled={!credentialsDirty}
            onSave={saveMail}
          />
        </Card>
      </Form>

      <Card title="IMAP (incoming)">
        <FieldLabelRow label="Server" readOnly>
          <Input value={server.imapHost} readOnly />
        </FieldLabelRow>
        <div className={settingsWorkspacePaneClasses.grid2}>
          <FieldLabelRow label="Port" readOnly>
            <Input value={server.imapPort} readOnly />
          </FieldLabelRow>
          <FieldLabelRow label="Security" readOnly>
            <Input value={formatMailTransportSecurityLabel(server.imapSecurity)} readOnly />
          </FieldLabelRow>
        </div>
      </Card>

      <Card title="SMTP (outgoing)">
        <FieldLabelRow label="Server" readOnly>
          <Input value={server.smtpHost} readOnly />
        </FieldLabelRow>
        <div className={settingsWorkspacePaneClasses.grid2}>
          <FieldLabelRow label="Port" readOnly>
            <Input value={server.smtpPort} readOnly />
          </FieldLabelRow>
          <FieldLabelRow label="Security" readOnly>
            <Input value={formatMailTransportSecurityLabel(server.smtpSecurity)} readOnly />
          </FieldLabelRow>
        </div>
      </Card>
    </>
  );
}

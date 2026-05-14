import { Mail as MailIcon } from "lucide-react";
import { Input } from "@/ui/input";
import { Button } from "@/button/src/button";
import { Card } from "@/card/src/card";
import { FormField } from "@/form-field/src/form-field";
import type { SettingsControllerState } from "@/settings-core/src/use-settings-controller";

function securityLabel(security: string): string {
  if (!security) return "Unknown";
  if (security.toLowerCase() === "ssl") return "SSL/TLS";
  return security.toUpperCase();
}

export type SettingsMailPaneProps = {
  mail: SettingsControllerState["mail"];
};

export function SettingsMailPane({ mail }: SettingsMailPaneProps) {
  return (
    <>
      <Card title="Credentials">
        <FormField label="Username">
          <Input
            value={mail.imapUsername}
            onChange={(event) => mail.setImapUsername(event.currentTarget.value)}
          />
        </FormField>
        <FormField label="Password">
          <Input
            type="password"
            value={mail.imapPassword}
            onChange={(event) => mail.setImapPassword(event.currentTarget.value)}
            placeholder={mail.imapHasPassword ? "••••••••" : "Enter password"}
          />
        </FormField>
        <div className="settings-workspace__form-actions">
          <Button
            onClick={mail.saveMail}
            disabled={!mail.mailDirty}
            label="Save changes"
            variant="subtle"
            size="md"
          />
        </div>
      </Card>

      <Card title="IMAP (incoming)">
        <FormField label="Server" readOnly icon={<MailIcon className="size-3.5 opacity-70" />}>
          <Input
            value={mail.server.imapHost}
            readOnly
            className="settings-workspace__input-readonly"
          />
        </FormField>
        <div className="settings-workspace__grid-2">
          <FormField label="Port" readOnly>
            <Input
              value={String(mail.server.imapPort)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormField>
          <FormField label="Security" readOnly>
            <Input
              value={securityLabel(mail.server.imapSecurity)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormField>
        </div>
      </Card>

      <Card title="SMTP (outgoing)">
        <FormField label="Server" readOnly icon={<MailIcon className="size-3.5 opacity-70" />}>
          <Input
            value={mail.server.smtpHost}
            readOnly
            className="settings-workspace__input-readonly"
          />
        </FormField>
        <div className="settings-workspace__grid-2">
          <FormField label="Port" readOnly>
            <Input
              value={String(mail.server.smtpPort)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormField>
          <FormField label="Security" readOnly>
            <Input
              value={securityLabel(mail.server.smtpSecurity)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </FormField>
        </div>
      </Card>
    </>
  );
}

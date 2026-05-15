import { Mail as MailIcon } from "lucide-react";
import { Input } from "@/ui/input";
import { Button } from "@/button/src/button";
import { Card } from "@/card/src/card";
import { FormField as LegacyFormField } from "@/form-field/src/form-field";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
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
  const { form, saveMail, imapHasPassword, server, savedImapUsername } = mail;
  const [imapUsernameWatch, imapPasswordWatch] = form.watch(["imapUsername", "imapPassword"]);

  const credentialsDirty = imapUsernameWatch !== savedImapUsername || imapPasswordWatch.length > 0;

  return (
    <>
      <Form {...form}>
        <Card title="Credentials">
          <FormField
            control={form.control}
            name="imapUsername"
            render={({ field }) => (
              <FormItem className="settings-workspace__form-field">
                <FormLabel className="settings-workspace__form-label">Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imapPassword"
            render={({ field }) => (
              <FormItem className="settings-workspace__form-field">
                <FormLabel className="settings-workspace__form-label">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    {...field}
                    placeholder={imapHasPassword ? "••••••••" : "Enter password"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="settings-workspace__form-actions">
            <Button
              type="button"
              onClick={() => void saveMail()}
              disabled={!credentialsDirty}
              label="Save changes"
              variant="subtle"
              size="md"
            />
          </div>
        </Card>
      </Form>

      <Card title="IMAP (incoming)">
        <LegacyFormField
          label="Server"
          readOnly
          icon={<MailIcon className="size-3.5 opacity-70" />}
        >
          <Input value={server.imapHost} readOnly className="settings-workspace__input-readonly" />
        </LegacyFormField>
        <div className="settings-workspace__grid-2">
          <LegacyFormField label="Port" readOnly>
            <Input
              value={String(server.imapPort)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </LegacyFormField>
          <LegacyFormField label="Security" readOnly>
            <Input
              value={securityLabel(server.imapSecurity)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </LegacyFormField>
        </div>
      </Card>

      <Card title="SMTP (outgoing)">
        <LegacyFormField
          label="Server"
          readOnly
          icon={<MailIcon className="size-3.5 opacity-70" />}
        >
          <Input value={server.smtpHost} readOnly className="settings-workspace__input-readonly" />
        </LegacyFormField>
        <div className="settings-workspace__grid-2">
          <LegacyFormField label="Port" readOnly>
            <Input
              value={String(server.smtpPort)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </LegacyFormField>
          <LegacyFormField label="Security" readOnly>
            <Input
              value={securityLabel(server.smtpSecurity)}
              readOnly
              className="settings-workspace__input-readonly"
            />
          </LegacyFormField>
        </div>
      </Card>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { useSettings, store } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Inbox, Send, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/mail")({ component: MailPage });

const securityOptions = [
  { value: "none", label: "None (plain)" },
  { value: "starttls", label: "STARTTLS" },
  { value: "ssl", label: "SSL / TLS" },
] as const;

function MailPage() {
  const settings = useSettings();
  const { mail } = settings;
  const set = (patch: Partial<typeof mail>) =>
    store.set((s) => ({ mail: { ...s.mail, ...patch } }));
  return (
    <AdminShell>
      <div className="px-10 py-10 max-w-6xl">
        <PageHeader
          eyebrow="Communication"
          title="Mail"
          description="Configure the IMAP and SMTP servers used by Nimbus Mail. User credentials are entered per-account in the user settings."
          actions={
            <Button
              onClick={async () => {
                try {
                  await store.saveSettings({
                    mail,
                    voice: settings.voice,
                    apps: settings.apps,
                    webdav: settings.webdav,
                  });
                  toast.success("Mail settings saved");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save mail settings");
                }
              }}
            >
              Save changes
            </Button>
          }
        />

        <Section
          title="Incoming mail (IMAP)"
          description="Used to fetch messages on behalf of signed-in users."
          aside={
            <ServerBadge
              icon={<Inbox className="h-3.5 w-3.5" />}
              label={`${mail.imapHost || "—"}:${mail.imapPort}`}
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Host" className="md:col-span-2">
              <Input
                value={mail.imapHost}
                onChange={(e) => set({ imapHost: e.target.value })}
                className="font-mono"
                placeholder="imap.example.com"
              />
            </Field>
            <Field label="Port">
              <Input
                type="number"
                value={mail.imapPort}
                onChange={(e) => set({ imapPort: Number(e.target.value) })}
                className="font-mono"
              />
            </Field>
            <Field label="Security" className="md:col-span-3">
              <Select
                value={mail.imapSecurity}
                onValueChange={(v: typeof mail.imapSecurity) => set({ imapSecurity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {securityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>

        <Section
          title="Outgoing mail (SMTP)"
          description="Used to relay mail composed in the cloud."
          aside={
            <ServerBadge
              icon={<Send className="h-3.5 w-3.5" />}
              label={`${mail.smtpHost || "—"}:${mail.smtpPort}`}
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Host" className="md:col-span-2">
              <Input
                value={mail.smtpHost}
                onChange={(e) => set({ smtpHost: e.target.value })}
                className="font-mono"
                placeholder="smtp.example.com"
              />
            </Field>
            <Field label="Port">
              <Input
                type="number"
                value={mail.smtpPort}
                onChange={(e) => set({ smtpPort: Number(e.target.value) })}
                className="font-mono"
              />
            </Field>
            <Field label="Security" className="md:col-span-3">
              <Select
                value={mail.smtpSecurity}
                onValueChange={(v: typeof mail.smtpSecurity) => set({ smtpSecurity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {securityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="mt-6 flex items-start gap-3 p-3 rounded-md bg-accent/40 border border-accent">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              Authentication credentials (username & password) are{" "}
              <span className="font-medium text-foreground">user-level</span> and configured per
              account from the user's mail preferences. They are never stored at the server level.
            </div>
          </div>
        </Section>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ServerBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-mono text-[11px]">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}

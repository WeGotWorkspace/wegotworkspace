import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { useSettings, store } from "@/lib/store";
import { Input } from "@wgw/ui";
import { Label } from "@wgw/ui";
import { Button } from "@wgw/ui";
import { Switch } from "@wgw/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wgw/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/webdav")({ component: WebdavPage });

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

function WebdavPage() {
  const settings = useSettings();
  const { webdav } = settings;
  const set = (patch: Partial<typeof webdav>) =>
    store.set((s) => ({ webdav: { ...s.webdav, ...patch } }));
  const saveSwitchSettings = async (
    patch: {
      webdav?: Partial<typeof settings.webdav>;
      apps?: Partial<typeof settings.apps>;
    },
    successMessage: string,
  ) => {
    const current = store.get();
    const nextWebdav = { ...current.webdav, ...(patch.webdav ?? {}) };
    const nextApps = { ...current.apps, ...(patch.apps ?? {}) };
    store.set({ webdav: nextWebdav, apps: nextApps });

    try {
      await store.saveSettings({
        mail: current.mail,
        voice: current.voice,
        apps: nextApps,
        webdav: nextWebdav,
      });
      toast.success(successMessage);
    } catch (e) {
      await store.reload();
      toast.error(e instanceof Error ? e.message : "Could not save setting");
    }
  };

  return (
    <AdminShell>
      <div className="px-10 py-10 max-w-6xl">
        <PageHeader
          eyebrow="Protocols"
          title="WebDAV"
          description="Configure SabreDAV, the WebDAV/CalDAV/CardDAV server stack powering external clients."
          actions={
            <Button
              onClick={async () => {
                try {
                  await store.saveSettings({
                    mail: settings.mail,
                    voice: settings.voice,
                    apps: settings.apps,
                    webdav,
                  });
                  toast.success("WebDAV configuration saved");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save WebDAV settings");
                }
              }}
            >
              Save changes
            </Button>
          }
        />

        <Section
          title="SabreDAV Web UI"
          description="Browser-based interface for inspecting DAV resources. Disable in production unless needed for debugging."
        >
          <div className="flex items-center justify-between p-4 rounded-md border border-border bg-surface">
            <div>
              <div className="font-display font-semibold text-sm">Enable Web UI</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Exposes the SabreDAV browser at{" "}
                <span className="font-mono text-foreground">
                  {webdav.baseUri || "/"}/server.php
                </span>
              </div>
            </div>
            <Switch
              checked={webdav.sabreUi}
              onCheckedChange={(v) => {
                void saveSwitchSettings(
                  { webdav: { sabreUi: Boolean(v) } },
                  `Web UI ${v ? "enabled" : "disabled"}`,
                );
              }}
            />
          </div>
        </Section>

        <Section
          title="Server identity"
          description="Identifiers and namespaces used in DAV responses."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Default timezone">
              <Select value={webdav.timezone} onValueChange={(v) => set({ timezone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Auth realm">
              <Input
                value={webdav.authRealm}
                onChange={(e) => set({ authRealm: e.target.value })}
                className="font-mono"
                placeholder="Nimbus"
              />
            </Field>
            <Field label="Sabre base URI" className="md:col-span-2">
              <Input
                value={webdav.baseUri}
                onChange={(e) => set({ baseUri: e.target.value })}
                className="font-mono"
                placeholder="/remote.php/dav"
              />
              <p className="text-[11px] text-muted-foreground font-mono">
                Path prefix where SabreDAV is mounted. Restart required for changes to take effect.
              </p>
            </Field>
          </div>
        </Section>

        <Section
          title="DAV features"
          description="Toggle CalDAV and CardDAV capabilities exposed by this SabreDAV instance."
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-surface p-4">
              <div>
                <div className="font-display font-semibold text-sm">Calendars (CalDAV)</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Exposes calendar collections and scheduling endpoints.
                </div>
              </div>
              <Switch
                checked={settings.apps.calendars}
                onCheckedChange={(v) => {
                  void saveSwitchSettings(
                    { apps: { calendars: Boolean(v) } },
                    `Calendars ${v ? "enabled" : "disabled"}`,
                  );
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-surface p-4">
              <div>
                <div className="font-display font-semibold text-sm">Contacts (CardDAV)</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Exposes address books and contact-card sync endpoints.
                </div>
              </div>
              <Switch
                checked={settings.apps.contacts}
                onCheckedChange={(v) => {
                  void saveSwitchSettings(
                    { apps: { contacts: Boolean(v) } },
                    `Contacts ${v ? "enabled" : "disabled"}`,
                  );
                }}
              />
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

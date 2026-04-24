import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight,
  ArrowLeft,
  Settings,
  FolderClosed,
  Users,
  Calendar,
} from "lucide-react";
import type { InstallerData } from "../types";

export function SiteStep({
  data,
  update,
  onNext,
  onBack,
}: {
  data: InstallerData["site"];
  update: (d: Partial<InstallerData["site"]>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const apps = [
    {
      key: "files" as const,
      label: "Files",
      desc: "Sync, share & store documents.",
      icon: FolderClosed,
    },
    {
      key: "contacts" as const,
      label: "Contacts",
      desc: "Shared address book via CardDAV.",
      icon: Users,
    },
    {
      key: "calendars" as const,
      label: "Calendars",
      desc: "Schedules & events via CalDAV.",
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-6 w-6 text-primary" /> Site settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize your installation.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Enabled apps</Label>
        <div className="overflow-hidden rounded-xl border bg-card">
          {apps.map((app, i) => (
            <div
              key={app.key}
              className={`flex items-center gap-4 p-4 ${i !== apps.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-red-soft)] text-primary">
                <app.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{app.label}</div>
                <div className="text-xs text-muted-foreground">{app.desc}</div>
              </div>
              <Switch
                checked={data.apps[app.key]}
                onCheckedChange={(v) =>
                  update({ apps: { ...data.apps, [app.key]: v } })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

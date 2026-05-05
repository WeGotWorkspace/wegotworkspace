import { Button } from "@wgw/ui";
import { Input } from "@wgw/ui";
import { Label } from "@wgw/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wgw/ui";
import { ArrowRight, ArrowLeft, Mail } from "lucide-react";
import type { InstallerData } from "../types";

export function MailStep({
  data,
  update,
  onNext,
  onSkip,
  onBack,
}: {
  data: InstallerData["mail"];
  update: (d: Partial<InstallerData["mail"]>) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Mail className="h-6 w-6 text-primary" /> Mail
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Optional
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure IMAP & SMTP to enable webmail for your users.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            IMAP - incoming
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_180px]">
            <div className="space-y-2">
              <Label>Server</Label>
              <Input
                value={data.imapHost}
                onChange={(e) => update({ imapHost: e.target.value })}
                placeholder="imap.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                value={data.imapPort}
                onChange={(e) => update({ imapPort: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Security</Label>
              <Select
                value={data.imapSecurity}
                onValueChange={(value: InstallerData["mail"]["imapSecurity"]) =>
                  update({ imapSecurity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose security" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="starttls">STARTTLS</SelectItem>
                  <SelectItem value="ssl">SSL / TLS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            SMTP - outgoing
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_180px]">
            <div className="space-y-2">
              <Label>Server</Label>
              <Input
                value={data.smtpHost}
                onChange={(e) => update({ smtpHost: e.target.value })}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                value={data.smtpPort}
                onChange={(e) => update({ smtpPort: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Security</Label>
              <Select
                value={data.smtpSecurity}
                onValueChange={(value: InstallerData["mail"]["smtpSecurity"]) =>
                  update({ smtpSecurity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose security" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="starttls">STARTTLS</SelectItem>
                  <SelectItem value="ssl">SSL / TLS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
          <Button onClick={onNext} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

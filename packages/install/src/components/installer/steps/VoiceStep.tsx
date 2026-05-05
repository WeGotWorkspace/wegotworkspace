import { Button } from "@wgw/ui";
import { Input } from "@wgw/ui";
import { Label } from "@wgw/ui";
import { ArrowRight, ArrowLeft, Phone } from "lucide-react";
import type { InstallerData } from "../types";

export function VoiceStep({
  data,
  update,
  onNext,
  onSkip,
  onBack,
}: {
  data: InstallerData["voice"];
  update: (d: Partial<InstallerData["voice"]>) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Phone className="h-6 w-6 text-primary" /> Voice & Video
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Optional
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If some participants have trouble connecting to calls or meetings (for
          example, on corporate or school networks), you can add server details
          here to help route the connection more reliably.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            STUN
          </div>
          <div className="space-y-2">
            <Label>STUN URL</Label>
            <Input
              value={data.stunUrl}
              onChange={(e) => update({ stunUrl: e.target.value })}
              placeholder="stun:stun.example.com:3478"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            TURN
          </div>
          <div className="space-y-2">
            <Label>TURN URL</Label>
            <Input
              value={data.turnUrl}
              onChange={(e) => update({ turnUrl: e.target.value })}
              placeholder="turn:turn.example.com:3478"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={data.turnUser}
                onChange={(e) => update({ turnUser: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={data.turnPassword}
                onChange={(e) => update({ turnPassword: e.target.value })}
              />
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

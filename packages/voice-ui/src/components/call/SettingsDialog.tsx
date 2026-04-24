import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon } from "lucide-react";
import { useSettings, type AuraSettings } from "@/lib/settings";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const { settings, save } = useSettings();
  const [draft, setDraft] = useState<AuraSettings>(settings);

  // Sync draft when dialog opens.
  if (open && draft !== settings && draft.signalingUrl === "" && settings.signalingUrl !== "") {
    setDraft(settings);
  }

  const update = <K extends keyof AuraSettings>(k: K, v: AuraSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = () => {
    save(draft);
    toast.success("Settings saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
            <SettingsIcon className="size-5 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your identity, signaling endpoint, and TURN server.
            All values are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              placeholder="e.g. Marcus Thorne"
              value={draft.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sig">
              Signaling URL
              <span className="ml-1.5 text-muted-foreground font-normal">(rooms.php)</span>
            </Label>
            <Input
              id="sig"
              placeholder="https://your-host/aura-signaling/rooms.php"
              value={draft.signalingUrl}
              onChange={(e) => update("signalingUrl", e.target.value)}
              className="rounded-xl font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Drop <code className="font-mono">rooms.php</code> on your LAMP server. See{" "}
              <code className="font-mono">/aura-signaling/README.md</code>.
            </p>
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold tracking-tight">TURN server</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                Optional. Required for peers behind strict NATs/firewalls (~15% of calls).
                STUN-only is fine for most networks; European STUN is always on.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="turn">TURN / STUN URL(s)</Label>
              <Textarea
                id="turn"
                placeholder="turn:eu-1.example.com:3478, turn:eu-2.example.com:3478?transport=tcp"
                value={draft.turnUrl}
                onChange={(e) => update("turnUrl", e.target.value)}
                className="rounded-xl font-mono text-xs min-h-20"
              />
              <p className="text-[11px] text-muted-foreground">
                Multiple URLs are supported (comma or newline separated) with one shared username/password.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tu">Username</Label>
                <Input
                  id="tu"
                  value={draft.turnUsername}
                  onChange={(e) => update("turnUsername", e.target.value)}
                  className="rounded-xl font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc">Credential (password)</Label>
                <Input
                  id="tc"
                  type="password"
                  value={draft.turnCredential}
                  onChange={(e) => update("turnCredential", e.target.value)}
                  className="rounded-xl font-mono text-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Provider secret keys are for server-side token generation and are not entered here.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-2xl">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

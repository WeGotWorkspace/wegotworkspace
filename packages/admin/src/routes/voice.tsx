import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { useSettings, store } from "@/lib/store";
import { Input } from "@wgw/ui";
import { Label } from "@wgw/ui";
import { Button } from "@wgw/ui";
import { Textarea } from "@wgw/ui";
import { Switch } from "@wgw/ui";
import { toast } from "sonner";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/voice")({ component: VoicePage });

function VoicePage() {
  const settings = useSettings();
  const { voice } = settings;
  const set = (patch: Partial<typeof voice>) =>
    store.set((s) => ({ voice: { ...s.voice, ...patch } }));
  const saveVoiceSettings = async (
    nextVoice: typeof voice,
    successMessage = "Voice configuration saved",
  ) => {
    await store.saveSettings({
      mail: settings.mail,
      voice: nextVoice,
      apps: settings.apps,
      webdav: settings.webdav,
    });
    toast.success(successMessage);
  };
  const onForceRelayChange = (checked: boolean) => {
    const previous = voice.forceRelay;
    const nextVoice = { ...voice, forceRelay: checked };
    set({ forceRelay: checked });
    void (async () => {
      try {
        await saveVoiceSettings(nextVoice, "Relay mode updated");
      } catch (e) {
        set({ forceRelay: previous });
        toast.error(e instanceof Error ? e.message : "Could not update relay mode");
      }
    })();
  };
  return (
    <AdminShell>
      <div className="px-10 py-10 max-w-6xl">
        <PageHeader
          eyebrow="Realtime"
          title="Voice"
          description="Override signaling and ICE servers for Nimbus Voice. Leave fields blank to use platform defaults."
          actions={
            <Button
              onClick={async () => {
                try {
                  await saveVoiceSettings(voice);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save voice settings");
                }
              }}
            >
              Save changes
            </Button>
          }
        />

        <Section
          title="Signaling"
          description="Advanced: override the signaling endpoint. Leave empty to use the built-in service."
        >
          <Field label="Signaling endpoint override (advanced)">
            <Input
              value={voice.signalingUrl}
              onChange={(e) => set({ signalingUrl: e.target.value })}
              className="font-mono"
              placeholder="/api/v1/voice"
            />
          </Field>
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <Radio className="h-3 w-3 text-success" />{" "}
            {voice.signalingUrl ? "Custom endpoint active" : "Using platform default"}
          </div>
        </Section>

        <Section
          title="STUN servers"
          description="Used by clients for NAT traversal. One URL per line."
        >
          <Field label="STUN URLs (optional)">
            <Textarea
              rows={3}
              value={voice.stunUrls}
              onChange={(e) => set({ stunUrls: e.target.value })}
              className="font-mono text-xs"
              placeholder="stun:stun.example.com:3478"
            />
          </Field>
        </Section>

        <Section
          title="TURN servers"
          description="Required when peers cannot connect directly. Provide URLs and credentials."
        >
          <Field label="TURN URLs (optional)">
            <Textarea
              rows={3}
              value={voice.turnUrls}
              onChange={(e) => set({ turnUrls: e.target.value })}
              className="font-mono text-xs"
              placeholder={
                "turn:turn.example.com:3478?transport=udp\nturns:turn.example.com:5349?transport=tcp"
              }
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="TURN username">
              <Input
                value={voice.turnUsername}
                onChange={(e) => set({ turnUsername: e.target.value })}
                className="font-mono"
                placeholder="nimbus"
              />
            </Field>
            <Field label="TURN password">
              <Input
                type="password"
                value={voice.turnPassword}
                onChange={(e) => set({ turnPassword: e.target.value })}
                className="font-mono"
                placeholder="••••••••"
              />
            </Field>
          </div>
          <div className="mt-4 rounded-md border border-border/60 p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium">Force TURN relay for all calls</div>
                <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  <strong>Off</strong> (recommended): try a direct connection first, and only use
                  TURN if needed. <strong>On</strong>: always use TURN, which works in more networks
                  but can increase relay traffic and cost.
                </div>
              </div>
              <Switch
                checked={voice.forceRelay}
                onCheckedChange={onForceRelayChange}
                aria-label="Force TURN relay"
              />
            </div>
          </div>
        </Section>
      </div>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
        {label}
      </Label>
      {children}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { useSettings, store } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/voice")({ component: VoicePage });

function VoicePage() {
  const settings = useSettings();
  const { voice } = settings;
  const set = (patch: Partial<typeof voice>) =>
    store.set((s) => ({ voice: { ...s.voice, ...patch } }));
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
                  await store.saveSettings({
                    mail: settings.mail,
                    voice,
                    apps: settings.apps,
                    webdav: settings.webdav,
                  });
                  toast.success("Voice configuration saved");
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
          description="Override URL for the WebSocket signaling endpoint that brokers calls."
        >
          <Field label="Signaling URL override">
            <Input
              value={voice.signalingUrl}
              onChange={(e) => set({ signalingUrl: e.target.value })}
              className="font-mono"
              placeholder="wss://signal.example.com/ws"
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

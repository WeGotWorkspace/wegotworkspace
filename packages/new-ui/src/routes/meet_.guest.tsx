import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Hand, Volume2 } from "lucide-react";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { BrandMark } from "@/brand-mark/src/brand-mark";

export const Route = createFileRoute("/meet_/guest")({
  component: GuestJoin,
  head: () => ({
    meta: [
      { title: "Join meeting" },
      { name: "description", content: "Join a video meeting as a guest." },
      { name: "theme-color", content: "#4f7cff" },
      { name: "apple-mobile-web-app-title", content: "Meet" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/meet.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/meet-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/meet-192.png" },
    ],
  }),
});

const ACCENT = "#4f7cff";
const SURFACE = "#0e0f17";
const PANEL = "#171826";
const PANEL_SOFT = "#20223a";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.6)";

const CAMS = [
  { id: "cam-1", label: "Built-in Camera" },
  { id: "cam-2", label: "External Webcam" },
];
const MICS = [
  { id: "mic-1", label: "Built-in Microphone" },
  { id: "mic-2", label: "Headset Microphone" },
];
const SPEAKERS = [
  { id: "spk-1", label: "Built-in Speakers" },
  { id: "spk-2", label: "Headphones" },
];

function BrandLogo() {
  return <BrandMark className="w-auto shrink-0" />;
}

function GuestJoin() {
  const [name, setName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [cam, setCam] = useState(CAMS[0].id);
  const [mic, setMic] = useState(MICS[0].id);
  const [spk, setSpk] = useState(SPEAKERS[0].id);
  const [knocking, setKnocking] = useState(false);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    if (!knocking) return;
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(id);
  }, [knocking]);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="min-h-screen w-full flex flex-col"
        style={{ background: SURFACE, color: TEXT, fontFamily: "var(--font-sans)" }}
      >
        <header className="flex items-center justify-between p-6 md:p-8 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo />
            <WorkspaceAppSwitcher />
          </div>
          <div className="text-xs" style={{ color: MUTED }}>
            You're joining as a guest
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-tight mb-10 whitespace-nowrap"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Join the meeting.
            </h1>

            <div
              className="relative aspect-video w-full overflow-hidden rounded-2xl border mb-8"
              style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
            >
              {videoOn ? (
                <div className="h-full w-full" style={{ background: `hsl(10 30% 18%)` }}>
                  <div className="flex h-full items-center justify-center">
                    <Initials name={name || "Guest"} />
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Initials name={name || "Guest"} />
                </div>
              )}

              {knocking && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm"
                  style={{ background: "rgba(8,9,18,0.6)" }}
                >
                  <div
                    className="mb-3 flex size-16 items-center justify-center rounded-full"
                    style={{ background: ACCENT, animation: "pulse 1.4s ease-in-out infinite" }}
                  >
                    <Hand className="size-7" />
                  </div>
                  <div className="text-base font-semibold">Knocking{".".repeat(dots)}</div>
                  <div className="mt-1 text-xs" style={{ color: MUTED }}>
                    Waiting for the host to let you in
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 right-3 flex gap-2">
                <CircleToggle
                  on={micOn}
                  onClick={() => setMicOn(!micOn)}
                  OnIcon={Mic}
                  OffIcon={MicOff}
                  label={micOn ? "Mute" : "Unmute"}
                />
                <CircleToggle
                  on={videoOn}
                  onClick={() => setVideoOn(!videoOn)}
                  OnIcon={Video}
                  OffIcon={VideoOff}
                  label={videoOn ? "Stop video" : "Start video"}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>
                  Your name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sam Rivera"
                  className="border-0 border-b-2 rounded-none bg-transparent px-0 text-lg focus-visible:ring-0"
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: TEXT }}
                  disabled={knocking}
                />
              </div>

              <DeviceRow
                icon={<Video className="size-4" />}
                label="Camera"
                value={cam}
                onChange={setCam}
                options={CAMS}
              />
              <DeviceRow
                icon={<Mic className="size-4" />}
                label="Microphone"
                value={mic}
                onChange={setMic}
                options={MICS}
              />
              <DeviceRow
                icon={<Volume2 className="size-4" />}
                label="Speaker"
                value={spk}
                onChange={setSpk}
                options={SPEAKERS}
              />

              {!knocking ? (
                <Button
                  onClick={() => setKnocking(true)}
                  disabled={!name.trim()}
                  className="w-full h-12 rounded-full text-base font-medium"
                  style={{ background: ACCENT, color: TEXT }}
                >
                  <Hand className="size-4" /> Ask to join
                </Button>
              ) : (
                <Button
                  onClick={() => setKnocking(false)}
                  variant="outline"
                  className="w-full h-12 rounded-full border-0 text-base font-medium"
                  style={{ background: PANEL_SOFT, color: TEXT }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.08); opacity: .85 } }`}</style>
    </TooltipProvider>
  );
}

function Initials({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold"
      style={{
        width: 84,
        height: 84,
        fontSize: 30,
        background: "rgba(255,255,255,0.1)",
        color: TEXT,
      }}
    >
      {initials}
    </div>
  );
}

function DeviceRow({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex size-9 items-center justify-center rounded-lg shrink-0"
        style={{ background: PANEL_SOFT, color: MUTED }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <Label className="text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>
          {label}
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            className="border-0 px-0 text-sm h-7"
            style={{ background: "transparent", color: TEXT }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CircleToggle({
  on,
  onClick,
  OnIcon,
  OffIcon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  OnIcon: React.ComponentType<{ className?: string }>;
  OffIcon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const Icon = on ? OnIcon : OffIcon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="inline-flex size-9 items-center justify-center rounded-full transition-colors"
          style={{ background: on ? PANEL_SOFT : "#e5484d", color: TEXT }}
          aria-label={label}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

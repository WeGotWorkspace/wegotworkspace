import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Hand, Volume2 } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppSwitcher } from "@/components/app-switcher";

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
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 227" className="w-auto shrink-0" style={{ height: "54px", marginTop: "-5px" }} fill="none" aria-hidden="true">
      <path fill="currentColor" d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893"/>
    </svg>
  );
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
            <AppSwitcher />
          </div>
          <div className="text-xs" style={{ color: MUTED }}>You're joining as a guest</div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <h1
              className="text-5xl md:text-6xl leading-[0.95] tracking-tight mb-10 whitespace-nowrap"
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
                <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm" style={{ background: "rgba(8,9,18,0.6)" }}>
                  <div
                    className="mb-3 flex size-16 items-center justify-center rounded-full"
                    style={{ background: ACCENT, animation: "pulse 1.4s ease-in-out infinite" }}
                  >
                    <Hand className="size-7" />
                  </div>
                  <div className="text-base font-semibold">Knocking{".".repeat(dots)}</div>
                  <div className="mt-1 text-xs" style={{ color: MUTED }}>Waiting for the host to let you in</div>
                </div>
              )}

              <div className="absolute bottom-3 right-3 flex gap-2">
                <CircleToggle on={micOn} onClick={() => setMicOn(!micOn)} OnIcon={Mic} OffIcon={MicOff} label={micOn ? "Mute" : "Unmute"} />
                <CircleToggle on={videoOn} onClick={() => setVideoOn(!videoOn)} OnIcon={Video} OffIcon={VideoOff} label={videoOn ? "Stop video" : "Start video"} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>Your name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sam Rivera"
                  className="border-0 border-b-2 rounded-none bg-transparent px-0 text-lg focus-visible:ring-0"
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: TEXT }}
                  disabled={knocking}
                />
              </div>

              <DeviceRow icon={<Video className="size-4" />} label="Camera" value={cam} onChange={setCam} options={CAMS} />
              <DeviceRow icon={<Mic className="size-4" />} label="Microphone" value={mic} onChange={setMic} options={MICS} />
              <DeviceRow icon={<Volume2 className="size-4" />} label="Speaker" value={spk} onChange={setSpk} options={SPEAKERS} />

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
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold"
      style={{ width: 84, height: 84, fontSize: 30, background: "rgba(255,255,255,0.1)", color: TEXT }}
    >
      {initials}
    </div>
  );
}

function DeviceRow({
  icon, label, value, onChange, options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg shrink-0" style={{ background: PANEL_SOFT, color: MUTED }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <Label className="text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="border-0 px-0 text-sm h-7" style={{ background: "transparent", color: TEXT }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CircleToggle({
  on, onClick, OnIcon, OffIcon, label,
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

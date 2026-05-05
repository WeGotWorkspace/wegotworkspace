import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings as SettingsIcon,
  MonitorUp,
  PhoneOff,
  Link as LinkIcon,
  Send,
  MessageSquare,
  Check,
  X,
  Hand,
  Copy,
  MoreVertical,
  LogOut,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSwitcher } from "@/components/app-switcher";

export const Route = createFileRoute("/meet")({
  component: MeetApp,
  head: () => ({
    meta: [
      { title: "Meet" },
      { name: "description", content: "Video conferencing for up to 4 people." },
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

const SIGNED_IN_USER = "Elias Linden";

const MOCK_CAMS = [
  { id: "cam-1", label: "FaceTime HD Camera (Built-in)" },
  { id: "cam-2", label: "Logitech BRIO 4K" },
  { id: "cam-3", label: "OBS Virtual Camera" },
];
const MOCK_MICS = [
  { id: "mic-1", label: "MacBook Pro Microphone" },
  { id: "mic-2", label: "AirPods Pro" },
  { id: "mic-3", label: "Shure MV7" },
];
const MOCK_SPEAKERS = [
  { id: "spk-1", label: "MacBook Pro Speakers" },
  { id: "spk-2", label: "AirPods Pro" },
  { id: "spk-3", label: "Studio Monitors" },
];

type Participant = {
  id: string;
  name: string;
  micOn: boolean;
  videoOn: boolean;
  speaking?: boolean;
  self?: boolean;
  hue: number;
};

type ChatMessage = { id: string; from: string; body: string; ts: number; system?: boolean };
type Knocker = { id: string; name: string };

function BrandLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 227" className="w-auto shrink-0" style={{ height: "54px", marginTop: "-5px" }} fill="none" aria-hidden="true">
      <path fill="currentColor" d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893"/>
    </svg>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const initials = SIGNED_IN_USER.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="size-9 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
          style={{ background: PANEL_SOFT, color: TEXT }}
          aria-label="User menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-0" style={{ background: PANEL, color: TEXT }}>
        <DropdownMenuItem className="text-xs opacity-60 focus:bg-transparent">
          {SIGNED_IN_USER}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/" })} className="cursor-pointer">
          <LogOut className="size-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MeetApp() {
  const [inCall, setInCall] = useState(false);
  const [displayName, setDisplayName] = useState(SIGNED_IN_USER);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [cam, setCam] = useState(MOCK_CAMS[0].id);
  const [mic, setMic] = useState(MOCK_MICS[0].id);
  const [spk, setSpk] = useState(MOCK_SPEAKERS[0].id);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="min-h-screen w-full flex flex-col"
        style={{
          background: SURFACE,
          color: TEXT,
          fontFamily: "var(--font-sans)",
        }}
      >
        <header
          className="flex items-center justify-between p-6 md:p-8 shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo />
            <AppSwitcher />
          </div>
          <UserMenu />
        </header>

        {!inCall ? (
          <Lobby
            displayName={displayName}
            setDisplayName={setDisplayName}
            micOn={micOn}
            setMicOn={setMicOn}
            videoOn={videoOn}
            setVideoOn={setVideoOn}
            cam={cam}
            setCam={setCam}
            mic={mic}
            setMic={setMic}
            spk={spk}
            setSpk={setSpk}
            onStart={() => setInCall(true)}
          />
        ) : (
          <CallRoom
            displayName={displayName}
            micOn={micOn}
            setMicOn={setMicOn}
            videoOn={videoOn}
            setVideoOn={setVideoOn}
            cam={cam}
            setCam={setCam}
            mic={mic}
            setMic={setMic}
            spk={spk}
            setSpk={setSpk}
            onLeave={() => setInCall(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

/* ---------- LOBBY ---------- */

function Lobby(props: {
  displayName: string;
  setDisplayName: (v: string) => void;
  micOn: boolean;
  setMicOn: (v: boolean) => void;
  videoOn: boolean;
  setVideoOn: (v: boolean) => void;
  cam: string;
  setCam: (v: string) => void;
  mic: string;
  setMic: (v: string) => void;
  spk: string;
  setSpk: (v: string) => void;
  onStart: () => void;
}) {
  const { displayName, setDisplayName, micOn, setMicOn, videoOn, setVideoOn, cam, setCam, mic, setMic, spk, setSpk, onStart } = props;

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1
          className="text-5xl md:text-6xl leading-[0.95] tracking-tight mb-10 whitespace-nowrap"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Ready when you are.
        </h1>

        {/* Preview */}
        <div
          className="relative aspect-video w-full overflow-hidden rounded-2xl border mb-8"
          style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
        >
          {videoOn ? (
            <FakeVideo name={displayName} hue={10} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Avatar name={displayName} size={84} />
            </div>
          )}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <CircleToggle on={micOn} onClick={() => setMicOn(!micOn)} OnIcon={Mic} OffIcon={MicOff} label={micOn ? "Mute" : "Unmute"} />
            <CircleToggle on={videoOn} onClick={() => setVideoOn(!videoOn)} OnIcon={Video} OffIcon={VideoOff} label={videoOn ? "Stop video" : "Start video"} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>Display name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="border-0 border-b-2 rounded-none bg-transparent px-0 text-lg focus-visible:ring-0"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: TEXT }}
            />
          </div>

          <DeviceRow icon={<Video className="size-4" />} label="Camera" value={cam} onChange={setCam} options={MOCK_CAMS} />
          <DeviceRow icon={<Mic className="size-4" />} label="Microphone" value={mic} onChange={setMic} options={MOCK_MICS} />
          <DeviceRow icon={<SettingsIcon className="size-4" />} label="Speaker" value={spk} onChange={setSpk} options={MOCK_SPEAKERS} />

          <Button
            onClick={onStart}
            className="w-full h-12 rounded-full text-base font-medium"
            style={{ background: ACCENT, color: TEXT }}
          >
            Start meeting
          </Button>
        </div>
      </div>
    </main>
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
          <SelectTrigger className="border-0 px-0 text-sm h-7 hover:opacity-80" style={{ background: "transparent", color: TEXT }}>
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

/* ---------- IN-CALL ---------- */

function CallRoom(props: {
  displayName: string;
  micOn: boolean;
  setMicOn: (v: boolean) => void;
  videoOn: boolean;
  setVideoOn: (v: boolean) => void;
  cam: string; setCam: (v: string) => void;
  mic: string; setMic: (v: string) => void;
  spk: string; setSpk: (v: string) => void;
  onLeave: () => void;
}) {
  const { displayName, micOn, setMicOn, videoOn, setVideoOn, cam, setCam, mic, setMic, spk, setSpk, onLeave } = props;
  const [chatOpen, setChatOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([
    { id: "self", name: displayName, micOn, videoOn, self: true, hue: 10 },
    { id: "p2", name: "Jamie Chen", micOn: true, videoOn: true, speaking: true, hue: 180 },
    { id: "p3", name: "Priya Patel", micOn: false, videoOn: true, hue: 30 },
  ]);

  useEffect(() => {
    setParticipants((ps) => ps.map((p) => (p.self ? { ...p, name: displayName, micOn, videoOn } : p)));
  }, [displayName, micOn, videoOn]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m1", from: "Jamie Chen", body: "Hey 👋 thanks for setting this up.", ts: Date.now() - 60000 },
    { id: "m2", from: displayName, body: "Of course! Let's wait a minute for Sam.", ts: Date.now() - 40000 },
  ]);
  const [draft, setDraft] = useState("");

  const [knockers, setKnockers] = useState<Knocker[]>([
    { id: "k1", name: "Sam Rivera" },
  ]);

  const callLink = useMemo(() => {
    if (typeof window === "undefined") return "https://meet.example.com/abc-defg-hij";
    return `${window.location.origin}/meet/guest?room=abc-defg-hij`;
  }, []);

  function admit(k: Knocker) {
    if (participants.length >= 4) {
      toast.error("Room is full (max 4)");
      return;
    }
    setParticipants((ps) => [...ps, { id: k.id, name: k.name, micOn: true, videoOn: true, hue: 110 }]);
    setKnockers((ks) => ks.filter((x) => x.id !== k.id));
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "system", body: `${k.name} joined the call`, ts: Date.now(), system: true }]);
  }
  function deny(k: Knocker) {
    setKnockers((ks) => ks.filter((x) => x.id !== k.id));
  }

  function muteParticipant(id: string) {
    setParticipants((ps) => ps.map((p) => (p.id === id ? { ...p, micOn: false } : p)));
    const target = participants.find((p) => p.id === id);
    if (target) toast.success(`Muted ${target.name}`);
  }

  function sendMessage() {
    const v = draft.trim();
    if (!v) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: displayName, body: v, ts: Date.now() }]);
    setDraft("");
  }

  const tileCount = participants.length;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsedLabel = useMemo(() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, [elapsed]);

  return (
    <main
      className="flex-1 grid gap-4 px-4 pb-4 pt-4 min-h-0"
      style={{ gridTemplateColumns: chatOpen ? "minmax(0,1fr) 340px" : "minmax(0,1fr)" }}
    >
      <div className="flex min-h-0 flex-col gap-4">
        {/* Top bar inside room */}
        <div
          className="flex items-center justify-between rounded-2xl border px-4 py-2.5"
          style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex size-2 rounded-full" style={{ background: "#34d399" }} />
            <span className="text-sm font-medium tabular-nums">{elapsedLabel}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center gap-1 text-xs"
                  style={{ color: MUTED }}
                  aria-label={`${participants.length} of 4 participants`}
                >
                  <Users className="size-3.5" />
                  {participants.length}/4
                </span>
              </TooltipTrigger>
              <TooltipContent>{participants.length} of 4 participants</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {knockers.length > 0 && <KnockBadge knockers={knockers} onAdmit={admit} onDeny={deny} />}
            <ShareButton link={callLink} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setChatOpen((o) => !o)}
                  className="hidden lg:inline-flex size-9 items-center justify-center rounded-lg transition-colors"
                  style={{ background: chatOpen ? ACCENT : PANEL_SOFT, color: TEXT }}
                  aria-label="Toggle chat"
                >
                  <MessageSquare className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{chatOpen ? "Hide chat" : "Show chat"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Video grid */}
        <div className="flex-1 min-h-0">
          {sharing ? (
            <div className="grid h-full gap-3" style={{ gridTemplateRows: "1fr auto" }}>
              <div className="relative overflow-hidden rounded-2xl border"
                style={{ background: "#000", borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex h-full items-center justify-center text-sm" style={{ color: MUTED }}>
                  <MonitorUp className="mr-2 size-4" /> You're sharing your screen
                </div>
                <div className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs" style={{ background: ACCENT }}>
                  Presenting
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {participants.map((p) => (
                  <Tile key={p.id} p={p} compact onMute={muteParticipant} />
                ))}
              </div>
            </div>
          ) : (
            <div className={`grid gap-3 h-full ${gridForCount(tileCount)}`}>
              {participants.map((p) => (
                <Tile key={p.id} p={p} onMute={muteParticipant} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-2xl border p-2"
            style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}>
            <CircleToggle on={micOn} onClick={() => setMicOn(!micOn)} OnIcon={Mic} OffIcon={MicOff} label={micOn ? "Mute" : "Unmute"} large />
            <CircleToggle on={videoOn} onClick={() => setVideoOn(!videoOn)} OnIcon={Video} OffIcon={VideoOff} label={videoOn ? "Stop video" : "Start video"} large />
            <DevicePopover cam={cam} setCam={setCam} mic={mic} setMic={setMic} spk={spk} setSpk={setSpk} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSharing((s) => !s)}
                  className="inline-flex size-11 items-center justify-center rounded-full transition-colors"
                  style={{ background: sharing ? ACCENT : PANEL_SOFT, color: TEXT }}
                  aria-label="Share screen"
                >
                  <MonitorUp className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{sharing ? "Stop sharing" : "Share screen"}</TooltipContent>
            </Tooltip>
            <div className="mx-1 h-8 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <button
                      aria-label="End call"
                      className="inline-flex size-11 items-center justify-center rounded-full transition-colors text-white"
                      style={{ background: "var(--destructive, #dc2626)" }}
                    >
                      <PhoneOff className="size-5" />
                    </button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>End call</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End call for everyone?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disconnect all {participants.length} participants from the meeting.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onLeave} style={{ background: "var(--destructive, #dc2626)", color: "#fff" }}>
                    End call
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Chat */}
      {chatOpen && (
        <aside className="flex min-h-0 flex-col rounded-2xl border"
          style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="size-4" /> Chat
            </div>
            <button onClick={() => setChatOpen(false)} className="text-xs" style={{ color: MUTED }} aria-label="Close chat">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m) =>
              m.system ? (
                <div key={m.id} className="text-center text-xs" style={{ color: MUTED }}>{m.body}</div>
              ) : (
                <div key={m.id} className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold">{m.from}</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>{formatTime(m.ts)}</span>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-sm" style={{ background: PANEL_SOFT }}>{m.body}</div>
                </div>
              )
            )}
          </div>
          <div className="border-t p-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Send a message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                className="border-0 text-sm" style={{ background: PANEL_SOFT, color: TEXT }}
              />
              <Button
                onClick={sendMessage}
                size="icon"
                style={{ background: ACCENT, color: TEXT }}
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </aside>
      )}
    </main>
  );
}

/* ---------- Sub components ---------- */

function gridForCount(n: number) {
  if (n <= 1) return "grid-cols-1 grid-rows-1";
  if (n === 2) return "grid-cols-2 grid-rows-1";
  return "grid-cols-2 grid-rows-2";
}

function Tile({ p, compact, onMute }: { p: Participant; compact?: boolean; onMute: (id: string) => void }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${compact ? "aspect-video" : ""}`}
      style={{
        background: PANEL,
        borderColor: p.speaking ? ACCENT : "rgba(255,255,255,0.06)",
        boxShadow: p.speaking ? `0 0 0 2px ${ACCENT}` : "none",
      }}
    >
      {p.videoOn ? (
        <FakeVideo name={p.name} hue={p.hue} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Avatar name={p.name} size={compact ? 40 : 80} />
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] backdrop-blur">
        {p.micOn ? <Mic className="size-3" /> : <MicOff className="size-3 text-red-400" />}
        <span>{p.name}{p.self ? " (you)" : ""}</span>
      </div>
      {!p.self && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-black/45 backdrop-blur opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 md:data-[state=open]:opacity-100 transition-opacity"
              style={{ color: TEXT }}
              aria-label={`Actions for ${p.name}`}
            >
              <MoreVertical className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-0" style={{ background: PANEL, color: TEXT }}>
            <DropdownMenuItem
              onClick={() => onMute(p.id)}
              disabled={!p.micOn}
              className="cursor-pointer"
            >
              <MicOff className="size-4 mr-2" /> Mute participant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function FakeVideo({ name, hue }: { name: string; hue: number }) {
  return (
    <div
      className="h-full w-full"
      style={{ background: `hsl(${hue} 30% 18%)` }}
    >
      <div className="flex h-full items-center justify-center">
        <Avatar name={name} size={84} />
      </div>
    </div>
  );
}

function Avatar({ name, size }: { name: string; size: number }) {
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold"
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: "rgba(255,255,255,0.1)", color: TEXT,
      }}
    >
      {initials}
    </div>
  );
}

function CircleToggle({
  on, onClick, OnIcon, OffIcon, label, large,
}: {
  on: boolean;
  onClick: () => void;
  OnIcon: React.ComponentType<{ className?: string }>;
  OffIcon: React.ComponentType<{ className?: string }>;
  label: string;
  large?: boolean;
}) {
  const Icon = on ? OnIcon : OffIcon;
  const size = large ? "size-11" : "size-9";
  const iconSize = large ? "size-5" : "size-4";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`inline-flex items-center justify-center rounded-full transition-colors ${size}`}
          style={{
            background: on ? PANEL_SOFT : "#e5484d",
            color: TEXT,
          }}
          aria-label={label}
        >
          <Icon className={iconSize} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DevicePopover(props: {
  cam: string; setCam: (v: string) => void;
  mic: string; setMic: (v: string) => void;
  spk: string; setSpk: (v: string) => void;
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="inline-flex size-11 items-center justify-center rounded-full"
              style={{ background: PANEL_SOFT, color: TEXT }}
              aria-label="Devices"
            >
              <SettingsIcon className="size-5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Devices</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="center"
        className="w-80 border-0 p-3"
        style={{ background: PANEL, color: TEXT }}
      >
        <div className="space-y-3">
          <DeviceRow icon={<Video className="size-4" />} label="Camera" value={props.cam} onChange={props.setCam} options={MOCK_CAMS} />
          <DeviceRow icon={<Mic className="size-4" />} label="Microphone" value={props.mic} onChange={props.setMic} options={MOCK_MICS} />
          <DeviceRow icon={<SettingsIcon className="size-4" />} label="Speaker" value={props.spk} onChange={props.setSpk} options={MOCK_SPEAKERS} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ShareButton({ link }: { link: string }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="inline-flex size-9 items-center justify-center rounded-lg transition-colors"
              style={{ background: PANEL_SOFT, color: TEXT }}
              aria-label="Share link"
            >
              <LinkIcon className="size-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Share link</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-96 border-0 p-3" style={{ background: PANEL, color: TEXT }}>
        <div className="space-y-2">
          <div className="text-xs" style={{ color: MUTED }}>Anyone with this link can knock to join.</div>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: PANEL_SOFT }}>
            <span className="flex-1 truncate text-sm">{link}</span>
            <Button
              size="icon"
              className="size-7"
              style={{ background: ACCENT }}
              onClick={() => {
                navigator.clipboard?.writeText(link);
                toast.success("Link copied");
              }}
              aria-label="Copy link"
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function KnockBadge({ knockers, onAdmit, onDeny }: { knockers: Knocker[]; onAdmit: (k: Knocker) => void; onDeny: (k: Knocker) => void }) {
  return (
    <Popover defaultOpen>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="relative inline-flex size-9 items-center justify-center rounded-lg"
              style={{ background: PANEL_SOFT, color: TEXT }}
              aria-label={`${knockers.length} knocking`}
            >
              <Hand className="size-4" />
              <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ background: ACCENT, color: TEXT }}>
                {knockers.length}
              </span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{knockers.length} waiting to join</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 border-0 p-2" style={{ background: PANEL, color: TEXT }}>
        <div className="space-y-1">
          {knockers.map((k) => (
            <div key={k.id} className="flex items-center gap-3 rounded-lg p-2" style={{ background: PANEL_SOFT }}>
              <Avatar name={k.name} size={36} />
              <div className="flex-1">
                <div className="text-sm font-medium">{k.name}</div>
                <div className="text-[11px]" style={{ color: MUTED }}>wants to join</div>
              </div>
              <button
                onClick={() => onDeny(k)}
                className="inline-flex size-8 items-center justify-center rounded-md"
                style={{ background: "rgba(255,255,255,0.06)", color: TEXT }}
                aria-label="Deny"
              >
                <X className="size-4" />
              </button>
              <button
                onClick={() => onAdmit(k)}
                className="inline-flex size-8 items-center justify-center rounded-md"
                style={{ background: ACCENT, color: TEXT }}
                aria-label="Admit"
              >
                <Check className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

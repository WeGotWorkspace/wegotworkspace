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
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/ui/button";
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
} from "@/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { BrandMark } from "@/brand-mark/src/brand-mark";

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
  return <BrandMark className="w-auto shrink-0" />;
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
            <WorkspaceAppSwitcher />
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  Hand,
  Check,
  X,
  Copy,
  MoreVertical,
  LogOut,
  Users,
  PictureInPicture2,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { BrandMark } from "@/brand-mark/src/brand-mark";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { MeetAPIOperations, MeetUIData } from "@/meet-core/src/meet-types";
import { useMeetController } from "@/meet-core/src/use-meet-controller";

const ACCENT = "#4f7cff";
const SURFACE = "#0e0f17";
const PANEL = "#171826";
const PANEL_SOFT = "#20223a";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.6)";
const URL_SPLIT_PATTERN = /((?:https?:\/\/|www\.)[^\s]+)/gi;

type MeetWorkspaceProps = {
  data: MeetUIData;
  session: WorkspaceSession;
  operations?: MeetAPIOperations;
  listLoading?: boolean;
};

type DeviceOption = {
  id: string;
  label: string;
  deviceId?: string;
};

function normalizeDeviceOptions(kind: "audioinput" | "videoinput", devices: MediaDeviceInfo[]) {
  let fallbackIndex = 0;
  const options = devices
    .filter((device) => device.kind === kind)
    .map((device) => {
      fallbackIndex += 1;
      return {
        id: device.deviceId || `__device:${kind}:${fallbackIndex}`,
        label:
          device.label?.trim() ||
          (kind === "audioinput" ? `Microphone ${fallbackIndex}` : `Camera ${fallbackIndex}`),
        deviceId: device.deviceId || undefined,
      } satisfies DeviceOption;
    });
  if (options.length > 0) return options;
  return [
    {
      id: `__none:${kind}`,
      label: kind === "audioinput" ? "No microphone detected" : "No camera detected",
    } satisfies DeviceOption,
  ];
}

function speakerOptionsFromAudioInputs(devices: MediaDeviceInfo[]): DeviceOption[] {
  const unique = new Map<string, DeviceOption>();
  let idx = 0;
  for (const device of devices) {
    idx += 1;
    const id = device.deviceId || `speaker-${idx}`;
    if (unique.has(id)) continue;
    unique.set(id, {
      id,
      label: device.label?.trim() || `Speaker ${idx}`,
      deviceId: device.deviceId || undefined,
    });
  }
  if (unique.size === 0) {
    unique.set("default", { id: "default", label: "System default" });
  }
  return [...unique.values()];
}

function selectedOptionId(
  options: DeviceOption[],
  activeDeviceId: string | null | undefined,
): string {
  if (activeDeviceId) {
    const match = options.find((option) => option.deviceId === activeDeviceId);
    if (match) return match.id;
  }
  return options[0]?.id ?? "__none";
}

function deviceIdForOption(options: DeviceOption[], optionId: string): string | null {
  const match = options.find((option) => option.id === optionId);
  return match?.deviceId ?? null;
}

function UserMenu({ displayName }: { displayName: string }) {
  const navigate = useNavigate();
  const initials = displayName
    .split(/\s+/)
    .map((segment) => segment[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="size-9 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
          style={{ background: PANEL_SOFT, color: TEXT }}
          aria-label="User menu"
        >
          {initials || "U"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-0"
        style={{ background: PANEL, color: TEXT }}
      >
        <DropdownMenuItem className="text-xs opacity-60 focus:bg-transparent">
          {displayName}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/" })} className="cursor-pointer">
          <LogOut className="size-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MeetWorkspace({ data, session, operations }: MeetWorkspaceProps) {
  const controller = useMeetController({
    session,
    defaultDisplayName: data.defaultDisplayName,
    rtc: data.rtc,
    operations,
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [speakerId, setSpeakerId] = useState<string>("default");
  const [knockDots, setKnockDots] = useState(1);
  const previousKnockerCountRef = useRef(0);
  const hasSignedInIdentity = Boolean(session.user.username?.trim() || session.user.email?.trim());
  const displayName = controller.displayName || session.user.displayName || "Guest";
  const invitedRoom = useMemo(() => {
    if (typeof window === "undefined") return null;
    const room = new URLSearchParams(window.location.search).get("room")?.trim();
    return room && room.length > 0 ? room : null;
  }, []);
  const inJoinFlow = Boolean(invitedRoom);
  const showUserMenu = hasSignedInIdentity && !inJoinFlow;
  const waitingForAdmission = controller.waitingForAdmission && inJoinFlow;
  const disableAppSwitcher = !hasSignedInIdentity || inJoinFlow;
  const callExitLabel = inJoinFlow || !hasSignedInIdentity ? "Leave call" : "End call";
  const callExitTitle =
    callExitLabel === "Leave call" ? "Leave this call?" : "End call for everyone?";
  const callExitDescription =
    callExitLabel === "Leave call"
      ? "This only disconnects you from the meeting."
      : "This will disconnect all participants from the meeting.";

  useEffect(() => {
    if (!waitingForAdmission) return;
    const id = window.setInterval(() => setKnockDots((dots) => (dots % 3) + 1), 500);
    return () => window.clearInterval(id);
  }, [waitingForAdmission]);

  useEffect(() => {
    const previous = previousKnockerCountRef.current;
    if (controller.knockers.length > previous) {
      playKnockSound();
      toast.info("Someone is knocking to join.");
    }
    previousKnockerCountRef.current = controller.knockers.length;
  }, [controller.knockers.length]);

  const cameras = useMemo(
    () => normalizeDeviceOptions("videoinput", controller.videoInputs),
    [controller.videoInputs],
  );
  const microphones = useMemo(
    () => normalizeDeviceOptions("audioinput", controller.audioInputs),
    [controller.audioInputs],
  );
  const speakers = useMemo(
    () => speakerOptionsFromAudioInputs(controller.audioInputs),
    [controller.audioInputs],
  );

  useEffect(() => {
    void controller.ensureLocalMedia().catch(() => {
      // Keep lobby usable if the user declines camera/mic permissions.
    });
  }, [controller]);

  const participantCount = controller.peers.length + (controller.inCall ? 1 : 0);
  const sharing = controller.screenOn;

  function sendMessage() {
    const value = draft.trim();
    if (!value) return;
    void controller.sendChat(value);
    setDraft("");
  }

  const activeCamera = selectedOptionId(cameras, controller.selectedCamId);
  const activeMic = selectedOptionId(microphones, controller.selectedMicId);
  const activeSpeaker = speakerId || speakers[0]?.id || "default";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`h-dvh w-full flex flex-col ${controller.inCall ? "overflow-hidden" : "overflow-y-auto"}`}
        style={{ background: SURFACE, color: TEXT, fontFamily: "var(--font-sans)" }}
      >
        <header className="flex items-center justify-between p-6 md:p-8 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark className="w-auto shrink-0" />
            <WorkspaceAppSwitcher disabled={disableAppSwitcher} />
          </div>
          {showUserMenu ? (
            <UserMenu displayName={displayName} />
          ) : (
            <div className="size-9" aria-hidden />
          )}
        </header>

        {!controller.inCall ? (
          <main className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-tight mb-10 whitespace-nowrap"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {inJoinFlow ? "Ready to join?" : "Ready when you are."}
              </h1>

              <div
                className="relative aspect-video w-full overflow-hidden rounded-2xl border mb-8"
                style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
              >
                {controller.videoOn ? (
                  <video
                    ref={controller.localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Avatar name={displayName} size={84} />
                  </div>
                )}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <CircleToggle
                    on={controller.micOn}
                    onClick={controller.toggleMic}
                    OnIcon={Mic}
                    OffIcon={MicOff}
                    label={controller.micOn ? "Mute" : "Unmute"}
                  />
                  <CircleToggle
                    on={controller.videoOn}
                    onClick={controller.toggleVideo}
                    OnIcon={Video}
                    OffIcon={VideoOff}
                    label={controller.videoOn ? "Stop video" : "Start video"}
                  />
                </div>
                {waitingForAdmission && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm"
                    style={{ background: "rgba(8,9,18,0.6)" }}
                  >
                    <div
                      className="mb-3 flex size-16 items-center justify-center rounded-full"
                      style={{ background: ACCENT }}
                    >
                      <Hand className="size-7" />
                    </div>
                    <div className="text-base font-semibold">Knocking{".".repeat(knockDots)}</div>
                    <div className="mt-1 text-xs" style={{ color: MUTED }}>
                      Waiting for the host to let you in
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <Label
                    className="text-[11px] uppercase tracking-[0.18em]"
                    style={{ color: MUTED }}
                  >
                    Display name
                  </Label>
                  <Input
                    value={controller.displayName}
                    onChange={(event) => controller.setDisplayName(event.target.value)}
                    className="border-0 border-b-2 rounded-none bg-transparent px-0 text-lg focus-visible:ring-0"
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: TEXT }}
                  />
                </div>

                <DeviceRow
                  icon={<Video className="size-4" />}
                  label="Camera"
                  value={activeCamera}
                  onChange={(id) => {
                    const deviceId = deviceIdForOption(cameras, id);
                    if (!deviceId) return;
                    void controller.switchCamera(deviceId);
                  }}
                  options={cameras}
                />
                <DeviceRow
                  icon={<Mic className="size-4" />}
                  label="Microphone"
                  value={activeMic}
                  onChange={(id) => {
                    const deviceId = deviceIdForOption(microphones, id);
                    if (!deviceId) return;
                    void controller.switchMic(deviceId);
                  }}
                  options={microphones}
                />
                <DeviceRow
                  icon={<SettingsIcon className="size-4" />}
                  label="Speaker"
                  value={activeSpeaker}
                  onChange={setSpeakerId}
                  options={speakers}
                />

                {!waitingForAdmission ? (
                  <Button
                    onClick={() => {
                      if (invitedRoom) {
                        void controller.requestJoin(invitedRoom);
                        return;
                      }
                      void controller.startMeeting();
                    }}
                    className="w-full h-12 rounded-full text-base font-medium"
                    style={{ background: ACCENT, color: TEXT }}
                  >
                    {invitedRoom ? "Ask to join" : "Start meeting"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => void controller.leave()}
                    variant="outline"
                    className="w-full h-12 rounded-full border-0 text-base font-medium"
                    style={{ background: PANEL_SOFT, color: TEXT }}
                  >
                    Cancel request
                  </Button>
                )}
                {controller.error && (
                  <p className="text-xs" style={{ color: "#fda4af" }}>
                    {controller.error}
                  </p>
                )}
                {controller.endedMessage && !controller.error && (
                  <p className="text-xs" style={{ color: MUTED }}>
                    {controller.endedMessage}
                  </p>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main
            className="flex-1 grid min-h-0 overflow-hidden gap-3 px-3 py-3 md:gap-4 md:px-4 md:pb-4 md:pt-4"
            style={{ gridTemplateColumns: chatOpen ? "minmax(0,1fr) 340px" : "minmax(0,1fr)" }}
          >
            <div className="flex min-h-0 flex-col gap-4">
              <div
                className="flex items-center justify-between rounded-2xl border px-4 py-2.5"
                style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex size-2 rounded-full"
                    style={{ background: "#34d399" }}
                  />
                  <span className="text-sm font-medium tabular-nums">
                    {controller.elapsedLabel}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: MUTED }}
                      >
                        <Users className="size-3.5" />
                        {participantCount}/4
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{participantCount} of 4 participants</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  {controller.knockers.length > 0 && (
                    <KnockBadge
                      knockers={controller.knockers}
                      onAdmit={(peerId) => void controller.admitKnocker(peerId)}
                      onDeny={(peerId) => void controller.denyKnocker(peerId)}
                    />
                  )}
                  <ShareButton link={controller.callLink} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setChatOpen((open) => !open)}
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

              <div className="flex-1 min-h-0">
                <div className="relative h-full min-h-0">
                  {sharing ? (
                    <div className="grid h-full gap-3" style={{ gridTemplateRows: "1fr auto" }}>
                      <div
                        className="relative overflow-hidden rounded-2xl border"
                        style={{ background: "#000", borderColor: "rgba(255,255,255,0.06)" }}
                      >
                        {controller.screenPreviewStream ? (
                          <StreamVideo stream={controller.screenPreviewStream} />
                        ) : (
                          <div
                            className="flex h-full items-center justify-center text-sm"
                            style={{ color: MUTED }}
                          >
                            <MonitorUp className="mr-2 size-4" /> You're sharing your screen
                          </div>
                        )}
                        <div
                          className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs"
                          style={{ background: ACCENT }}
                        >
                          Presenting
                        </div>
                      </div>
                      {controller.peers.length > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                          {controller.peers.map((peer) => (
                            <PeerTile key={peer.id} name={peer.name} stream={peer.stream} compact />
                          ))}
                        </div>
                      ) : (
                        <div
                          className="flex flex-col items-center justify-center rounded-2xl border p-4 text-xs gap-3"
                          style={{
                            borderColor: "rgba(255,255,255,0.06)",
                            color: MUTED,
                            background: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <span>Waiting for others to join...</span>
                          <ShareInline link={controller.callLink} />
                        </div>
                      )}
                    </div>
                  ) : controller.peers.length > 0 ? (
                    <div className={`grid gap-3 h-full ${gridForCount(controller.peers.length)}`}>
                      {controller.peers.map((peer) => (
                        <PeerTile key={peer.id} name={peer.name} stream={peer.stream} />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="h-full rounded-2xl border flex flex-col items-center justify-center text-sm gap-3 p-4"
                      style={{
                        borderColor: "rgba(255,255,255,0.06)",
                        color: MUTED,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span>Waiting for others to join...</span>
                      <ShareInline link={controller.callLink} />
                    </div>
                  )}

                  <SelfPreviewPiP
                    name={displayName}
                    videoOn={controller.videoOn}
                    micOn={controller.micOn}
                    videoRef={controller.localVideoRef}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div
                  className="flex items-center gap-2 rounded-2xl border p-2"
                  style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <CircleToggle
                    on={controller.micOn}
                    onClick={controller.toggleMic}
                    OnIcon={Mic}
                    OffIcon={MicOff}
                    label={controller.micOn ? "Mute" : "Unmute"}
                    large
                  />
                  <CircleToggle
                    on={controller.videoOn}
                    onClick={controller.toggleVideo}
                    OnIcon={Video}
                    OffIcon={VideoOff}
                    label={controller.videoOn ? "Stop video" : "Start video"}
                    large
                  />
                  <DevicePopover
                    cameras={cameras}
                    microphones={microphones}
                    speakers={speakers}
                    camera={activeCamera}
                    microphone={activeMic}
                    speaker={activeSpeaker}
                    onCamera={(id) => {
                      const deviceId = deviceIdForOption(cameras, id);
                      if (!deviceId) return;
                      void controller.switchCamera(deviceId);
                    }}
                    onMicrophone={(id) => {
                      const deviceId = deviceIdForOption(microphones, id);
                      if (!deviceId) return;
                      void controller.switchMic(deviceId);
                    }}
                    onSpeaker={setSpeakerId}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => void controller.toggleScreenShare()}
                        className="inline-flex size-11 items-center justify-center rounded-full transition-colors"
                        style={{
                          background: controller.screenOn ? ACCENT : PANEL_SOFT,
                          color: TEXT,
                        }}
                        aria-label="Share screen"
                      >
                        <MonitorUp className="size-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {controller.screenOn ? "Stop sharing" : "Share screen"}
                    </TooltipContent>
                  </Tooltip>
                  <div className="mx-1 h-8 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <button
                            aria-label={callExitLabel}
                            className="inline-flex size-11 items-center justify-center rounded-full transition-colors text-white"
                            style={{ background: "var(--destructive, #dc2626)" }}
                          >
                            <PhoneOff className="size-5" />
                          </button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>{callExitLabel}</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{callExitTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{callExitDescription}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            void (callExitLabel === "End call"
                              ? controller.endCallForAll()
                              : controller.leave())
                          }
                          style={{ background: "var(--destructive, #dc2626)", color: "#fff" }}
                        >
                          {callExitLabel}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {chatOpen && (
              <aside
                className="flex min-h-0 flex-col rounded-2xl border"
                style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-3"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="size-4" /> Chat
                  </div>
                  <button
                    onClick={() => setChatOpen(false)}
                    className="text-xs"
                    style={{ color: MUTED }}
                    aria-label="Close chat"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  {controller.chatMessages.length === 0 && (
                    <div className="text-center text-xs" style={{ color: MUTED }}>
                      Messages from participants will appear here.
                    </div>
                  )}
                  {controller.chatMessages.map((message) => (
                    <div key={message.id} className="space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold">
                          {message.isSelf ? "You" : message.fromName}
                        </span>
                        <span className="text-[10px]" style={{ color: MUTED }}>
                          {formatTime(message.ts)}
                        </span>
                      </div>
                      <div
                        className="rounded-lg px-3 py-2 text-sm wrap-break-word"
                        style={{ background: PANEL_SOFT }}
                      >
                        {renderChatBody(message.body)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t p-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Send a message"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") sendMessage();
                      }}
                      className="border-0 text-sm"
                      style={{ background: PANEL_SOFT, color: TEXT }}
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
        )}
      </div>
    </TooltipProvider>
  );
}

function gridForCount(n: number) {
  if (n <= 1) return "grid-cols-1 grid-rows-1";
  if (n === 2) return "grid-cols-2 grid-rows-1";
  return "grid-cols-2 grid-rows-2";
}

function StreamVideo({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !stream) return;
    node.srcObject = stream;
    return () => {
      node.srcObject = null;
    };
  }, [stream]);
  if (!stream) return null;
  return <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />;
}

function SelfPreviewPiP({
  name,
  videoOn,
  micOn,
  videoRef,
}: {
  name: string;
  videoOn: boolean;
  micOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isBrowserPiP, setIsBrowserPiP] = useState(false);

  const clampPosition = (x: number, y: number) => {
    const root = rootRef.current;
    const parent = root?.parentElement;
    if (!root || !parent) return { x, y };
    const maxX = Math.max(0, parent.clientWidth - root.offsetWidth);
    const maxY = Math.max(0, parent.clientHeight - root.offsetHeight);
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  };

  useEffect(() => {
    const root = rootRef.current;
    const parent = root?.parentElement;
    if (!root || !parent || position) return;
    const defaultX = Math.max(0, parent.clientWidth - root.offsetWidth - 12);
    const defaultY = 12;
    setPosition({ x: defaultX, y: defaultY });
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      if (!position) return;
      setPosition((prev) => {
        if (!prev) return prev;
        return clampPosition(prev.x, prev.y);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position]);

  const toggleBrowserPiP = async () => {
    const video = videoRef.current;
    if (!video) {
      toast.info("Camera preview is not ready yet.");
      return;
    }
    const doc = document as Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };
    const canRequestPiP =
      "pictureInPictureEnabled" in document &&
      (document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled &&
      typeof (video as HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> })
        .requestPictureInPicture === "function";
    if (!canRequestPiP) {
      toast.info("Picture-in-Picture is not supported in this browser.");
      return;
    }
    try {
      if (doc.pictureInPictureElement && doc.exitPictureInPicture) {
        await doc.exitPictureInPicture();
      } else {
        await (
          video as HTMLVideoElement & { requestPictureInPicture: () => Promise<unknown> }
        ).requestPictureInPicture();
      }
    } catch {
      toast.error("Could not open Picture-in-Picture.");
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsBrowserPiP(true);
    const onLeave = () => setIsBrowserPiP(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
      setIsBrowserPiP(false);
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const doc = document as Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };
    const canRequestPiP =
      "pictureInPictureEnabled" in document &&
      (document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled &&
      typeof (video as HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> })
        .requestPictureInPicture === "function";
    if (!canRequestPiP) return;

    const onVisibilityChange = () => {
      const currentVideo = videoRef.current;
      if (!currentVideo) return;
      const isHidden = document.visibilityState === "hidden";
      if (isHidden) {
        if (doc.pictureInPictureElement) return;
        void (
          currentVideo as HTMLVideoElement & { requestPictureInPicture: () => Promise<unknown> }
        )
          .requestPictureInPicture()
          .catch(() => {
            // Browsers can block PiP auto-entry without recent user interaction.
          });
        return;
      }
      if (doc.pictureInPictureElement === currentVideo && doc.exitPictureInPicture) {
        void doc.exitPictureInPicture().catch(() => {
          // Ignore close failures; user might have already dismissed PiP.
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [videoRef]);

  const handlePointerDown = (event: {
    target: EventTarget | null;
    clientX: number;
    clientY: number;
  }) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const root = rootRef.current;
    if (!root) return;
    const start = position ?? { x: 12, y: 12 };
    const startX = event.clientX;
    const startY = event.clientY;
    setDragging(true);
    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setPosition(clampPosition(start.x + deltaX, start.y + deltaY));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const x = position?.x ?? 12;
  const y = position?.y ?? 12;

  const sizeClass = isBrowserPiP ? "w-28 md:w-32" : "w-44 md:w-52";

  return (
    <div
      ref={rootRef}
      onPointerDown={handlePointerDown}
      className={`absolute left-0 top-0 ${sizeClass} aspect-video overflow-hidden rounded-xl border shadow-xl z-20 touch-none select-none`}
      style={{
        background: PANEL,
        borderColor: "rgba(255,255,255,0.22)",
        transform: `translate(${x}px, ${y}px)`,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      {videoOn ? (
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Avatar name={name} size={48} />
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] backdrop-blur">
        {micOn ? <Mic className="size-3" /> : <MicOff className="size-3 text-red-400" />}
        <span className="max-w-24 truncate">{name} (you)</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void toggleBrowserPiP()}
            className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-md bg-black/50 text-white/90 hover:text-white backdrop-blur"
            aria-label="Open picture-in-picture"
            title="Open picture-in-picture"
          >
            <PictureInPicture2 className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Open system Picture-in-Picture</TooltipContent>
      </Tooltip>
    </div>
  );
}

function PeerTile({
  name,
  stream,
  compact,
}: {
  name: string;
  stream: MediaStream | null;
  compact?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${compact ? "aspect-video" : ""}`}
      style={{ background: PANEL, borderColor: "rgba(255,255,255,0.06)" }}
    >
      {stream ? (
        <StreamVideo stream={stream} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Avatar name={name} size={compact ? 40 : 80} />
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] backdrop-blur">
        <Mic className="size-3" />
        <span>{name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-black/45 backdrop-blur opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 md:data-[state=open]:opacity-100 transition-opacity"
            style={{ color: TEXT }}
            aria-label={`Actions for ${name}`}
          >
            <MoreVertical className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-0"
          style={{ background: PANEL, color: TEXT }}
        >
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => toast.info(`Mute controls for ${name} will be added soon`)}
          >
            <MicOff className="size-4 mr-2" /> Mute participant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Avatar({ name, size }: { name: string; size: number }) {
  const initials =
    name
      .split(/\s+/)
      .map((segment) => segment[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
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
  onChange: (value: string) => void;
  options: DeviceOption[];
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
            className="border-0 px-0 text-sm h-7 hover:opacity-80"
            style={{ background: "transparent", color: TEXT }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
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
  large,
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
          style={{ background: on ? PANEL_SOFT : "#e5484d", color: TEXT }}
          aria-label={label}
        >
          <Icon className={iconSize} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DevicePopover({
  cameras,
  microphones,
  speakers,
  camera,
  microphone,
  speaker,
  onCamera,
  onMicrophone,
  onSpeaker,
}: {
  cameras: DeviceOption[];
  microphones: DeviceOption[];
  speakers: DeviceOption[];
  camera: string;
  microphone: string;
  speaker: string;
  onCamera: (value: string) => void;
  onMicrophone: (value: string) => void;
  onSpeaker: (value: string) => void;
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
          <DeviceRow
            icon={<Video className="size-4" />}
            label="Camera"
            value={camera}
            onChange={onCamera}
            options={cameras}
          />
          <DeviceRow
            icon={<Mic className="size-4" />}
            label="Microphone"
            value={microphone}
            onChange={onMicrophone}
            options={microphones}
          />
          <DeviceRow
            icon={<SettingsIcon className="size-4" />}
            label="Speaker"
            value={speaker}
            onChange={onSpeaker}
            options={speakers}
          />
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
      <PopoverContent
        align="end"
        className="w-96 border-0 p-3"
        style={{ background: PANEL, color: TEXT }}
      >
        <div className="space-y-2">
          <div className="text-xs" style={{ color: MUTED }}>
            Anyone with this link can join the room.
          </div>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: PANEL_SOFT }}
          >
            <span className="flex-1 truncate text-sm">
              {link || "Start a meeting to generate a share link"}
            </span>
            <Button
              size="icon"
              className="size-7"
              style={{ background: ACCENT }}
              disabled={!link}
              onClick={() => {
                if (!link) return;
                void navigator.clipboard?.writeText(link);
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

function ShareInline({ link }: { link: string }) {
  return (
    <div className="w-full max-w-md rounded-lg px-3 py-2" style={{ background: PANEL_SOFT }}>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-xs">{link || "Share link will appear here."}</span>
        <Button
          size="icon"
          className="size-7"
          style={{ background: ACCENT }}
          disabled={!link}
          onClick={() => {
            if (!link) return;
            void navigator.clipboard?.writeText(link);
            toast.success("Link copied");
          }}
          aria-label="Copy link"
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function KnockBadge({
  knockers,
  onAdmit,
  onDeny,
}: {
  knockers: Array<{ id: string; name: string }>;
  onAdmit: (peerId: string) => void;
  onDeny: (peerId: string) => void;
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="relative inline-flex size-9 items-center justify-center rounded-lg"
              style={{ background: PANEL_SOFT, color: TEXT }}
              aria-label={`${knockers.length} waiting to join`}
            >
              <Hand className="size-4" />
              <span
                className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ background: ACCENT, color: TEXT }}
              >
                {knockers.length}
              </span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{knockers.length} waiting to join</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="w-80 border-0 p-2"
        style={{ background: PANEL, color: TEXT }}
      >
        <div className="space-y-1">
          {knockers.map((knocker) => (
            <div
              key={knocker.id}
              className="flex items-center gap-3 rounded-lg p-2"
              style={{ background: PANEL_SOFT }}
            >
              <Avatar name={knocker.name} size={36} />
              <div className="flex-1">
                <div className="text-sm font-medium">{knocker.name}</div>
                <div className="text-[11px]" style={{ color: MUTED }}>
                  wants to join
                </div>
              </div>
              <button
                onClick={() => onDeny(knocker.id)}
                className="inline-flex size-8 items-center justify-center rounded-md"
                style={{ background: "rgba(255,255,255,0.06)", color: TEXT }}
                aria-label={`Deny ${knocker.name}`}
              >
                <X className="size-4" />
              </button>
              <button
                onClick={() => onAdmit(knocker.id)}
                className="inline-flex size-8 items-center justify-center rounded-md"
                style={{ background: ACCENT, color: TEXT }}
                aria-label={`Admit ${knocker.name}`}
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

function playKnockSound() {
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx();
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  gain.connect(context.destination);

  const toneA = context.createOscillator();
  toneA.type = "sine";
  toneA.frequency.setValueAtTime(740, now);
  toneA.connect(gain);
  toneA.start(now);
  toneA.stop(now + 0.16);

  const toneB = context.createOscillator();
  toneB.type = "sine";
  toneB.frequency.setValueAtTime(988, now + 0.18);
  toneB.connect(gain);
  toneB.start(now + 0.18);
  toneB.stop(now + 0.38);

  window.setTimeout(() => {
    void context.close().catch(() => {
      // Ignore close race errors.
    });
  }, 700);
}

function renderChatBody(text: string) {
  const parts = text.split(URL_SPLIT_PATTERN);
  return parts.map((part, index) => {
    if (!part) return null;
    const isUrl = /^(?:https?:\/\/|www\.)/i.test(part);
    if (!isUrl) return <span key={`txt-${index}`}>{part}</span>;
    const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
    return (
      <a
        key={`lnk-${index}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:opacity-80"
        style={{ color: "#93c5fd" }}
      >
        {part}
      </a>
    );
  });
}

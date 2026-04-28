import { useEffect, useRef, useState } from "react";
import { useMesh } from "@/hooks/use-mesh";
import { VideoStage } from "./VideoStage";
import { ControlsDock } from "./ControlsDock";
import { RoomPanel } from "./RoomPanel";
import { MediaDeviceSettings } from "./MediaDeviceSettings";
import { SidebarDisplayName } from "./SidebarDisplayName";
import { VoiceChatSidebar } from "./VoiceChatSidebar";
import { ShieldCheck, Globe2, LogOut, Menu } from "lucide-react";
import { buildGuestJoinPath } from "@/lib/sabreJoinUrl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

function readCanCreateRoom(): boolean {
  if (typeof window === "undefined") return true;
  const c = window.__SABRE_VOICE_CONFIG__?.canCreateRoom;
  if (c === false) return false;
  return true;
}

function readLogoutUrl(): string {
  if (typeof window === "undefined") return "/logout/";
  const configured = window.__SABRE_VOICE_CONFIG__?.logoutUrl?.trim();
  if (configured) return configured;
  const m = window.location.pathname.match(/^(.*)\/voice(?:\/.*)?$/);
  const base = m ? m[1] : "";
  const normalized = `${base}/logout/`.replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

/** Survives React StrictMode remounts so URL auto-join only runs once per full page load. */
let sabreVoiceUrlAutoJoinStarted = false;

export function CallApp({ initialAutoJoinRoom = null }: { initialAutoJoinRoom?: string | null }) {
  const mesh = useMesh();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const meshRef = useRef(mesh);
  meshRef.current = mesh;
  const urlStateRef = useRef<{ originalPath: string; replaced: boolean } | null>(null);
  const inCall = mesh.status === "in-call" || mesh.status === "preparing";
  const canCreateRoom = readCanCreateRoom();
  const logoutUrl = readLogoutUrl();

  useEffect(() => {
    if (!initialAutoJoinRoom || sabreVoiceUrlAutoJoinStarted) return;
    sabreVoiceUrlAutoJoinStarted = true;
    void meshRef.current.joinRoom(initialAutoJoinRoom);
  }, [initialAutoJoinRoom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const leaveOnUnload = () => {
      meshRef.current.leaveForPageUnload();
    };
    window.addEventListener("pagehide", leaveOnUnload);
    window.addEventListener("beforeunload", leaveOnUnload);
    return () => {
      window.removeEventListener("pagehide", leaveOnUnload);
      window.removeEventListener("beforeunload", leaveOnUnload);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!urlStateRef.current) {
      urlStateRef.current = {
        originalPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        replaced: false,
      };
    }

    const current = urlStateRef.current;
    if (!current) return;

    if (inCall && mesh.roomCode) {
      const joinPath = buildGuestJoinPath(mesh.roomCode);
      if (window.location.pathname !== joinPath || window.location.search || window.location.hash) {
        window.history.replaceState(window.history.state, "", joinPath);
      }
      current.replaced = true;
      return;
    }

    if (current.replaced) {
      const now = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (now !== current.originalPath) {
        window.history.replaceState(window.history.state, "", current.originalPath);
      }
      current.replaced = false;
    }
  }, [inCall, mesh.roomCode]);

  const sidebarContent = (
    <>
      <div className="p-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-2xl bg-primary flex items-center justify-center soft-shadow">
            <div className="size-3 rounded-full bg-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight leading-none">Voice</div>
            <div className="text-[11px] text-muted-foreground mt-1">WeGotWorkspace</div>
          </div>
        </div>
      </div>

      <SidebarDisplayName />

      <MediaDeviceSettings
        surface="sidebar"
        audioInputs={mesh.audioInputs}
        videoInputs={mesh.videoInputs}
        selectedMicId={mesh.selectedMicId}
        selectedCamId={mesh.selectedCamId}
        onMicChange={mesh.setSelectedMicId}
        onCamChange={mesh.setSelectedCamId}
      />

      <div className="px-7 pb-6 flex-1 overflow-y-auto min-h-0">
        <RoomPanel
          status={mesh.status}
          roomCode={mesh.roomCode}
          onJoin={mesh.joinRoom}
          onLeave={mesh.leave}
          canCreateRoom={canCreateRoom}
        />

        {mesh.error && (
          <div className="mt-5 p-3 rounded-2xl bg-danger-soft border border-destructive/20 text-xs text-destructive leading-relaxed">
            {mesh.error}
          </div>
        )}
      </div>

      <div className="p-7 border-t border-border space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          End-to-end encrypted (DTLS-SRTP)
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Globe2 className="size-3.5 text-primary" />
          European STUN · optional TURN
        </div>
        <a
          href={logoutUrl}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[340px] shrink-0 border-r border-border flex-col bg-sidebar/60 backdrop-blur-sm">
        {sidebarContent}
      </aside>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          id="voice-mobile-nav"
          className="w-[340px] max-w-[90vw] border-r border-border bg-sidebar/95 p-0 backdrop-blur-sm md:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Voice sidebar</SheetTitle>
          </SheetHeader>
          <div className="h-full min-h-0 flex flex-col">{sidebarContent}</div>
        </SheetContent>
      </Sheet>

      {/* Main + chat */}
      <div className="flex-1 flex min-w-0 min-h-0">
        <main className="relative flex-1 p-6 flex flex-col gap-6 min-w-0 min-h-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden absolute left-4 top-4 z-20 h-10 w-10 bg-background/85 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open voice sidebar"
            aria-expanded={mobileSidebarOpen}
            aria-controls="voice-mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <VideoStage
            status={mesh.status}
            startedAt={mesh.startedAt}
            camOn={mesh.camOn}
            micOn={mesh.micOn}
            peers={mesh.peers}
            localVideoRef={mesh.localVideoRef}
          />
          <ControlsDock
            micOn={mesh.micOn}
            camOn={mesh.camOn}
            screenOn={mesh.screenOn}
            inCall={inCall}
            onToggleMic={mesh.toggleMic}
            onToggleCam={mesh.toggleCam}
            onToggleScreen={mesh.toggleScreen}
            onHangup={() => void mesh.leave()}
            audioInputs={mesh.audioInputs}
            videoInputs={mesh.videoInputs}
            selectedMicId={mesh.selectedMicId}
            selectedCamId={mesh.selectedCamId}
            onMicChange={mesh.setSelectedMicId}
            onCamChange={mesh.setSelectedCamId}
          />
        </main>
        <VoiceChatSidebar
          inCall={inCall}
          messages={mesh.chatMessages}
          onSend={mesh.sendChatMessage}
        />
      </div>
    </div>
  );
}

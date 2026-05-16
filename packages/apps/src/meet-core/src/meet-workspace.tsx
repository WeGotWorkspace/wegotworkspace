import { useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/ui/tooltip";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
import { MeetChatPane } from "@/meet-core/src/meet-chat-pane";
import { playMeetKnockSound } from "@/meet-core/src/meet-chat-utils";
import {
  meetSpeakerOptionsFromAudioInputs,
  normalizeMeetDeviceOptions,
  selectedMeetDeviceOptionId,
} from "@/meet-core/src/meet-device-utils";
import { MeetLobbyPane } from "@/meet-core/src/meet-lobby-pane";
import { MeetRoomPane } from "@/meet-core/src/meet-room-pane";
import { meetLabels } from "@/meet-core/src/meet-labels";
import { MeetUserMenu } from "@/meet-core/src/meet-user-menu";
import type { MeetWorkspaceProps } from "@/meet-core/src/meet-workspace-props";
import { useMeetController } from "@/meet-core/src/use-meet-controller";
import "@/meet-core/src/meet-workspace.css";

export function MeetWorkspace({
  data,
  session,
  operations,
  onLogout,
  className,
}: MeetWorkspaceProps) {
  const toast = useAppToast();
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
  const [guestInviteState, setGuestInviteState] = useState<"checking" | "active" | "missing">(
    inJoinFlow && !hasSignedInIdentity ? "checking" : "active",
  );
  const isGuestInviteFlow = inJoinFlow && !hasSignedInIdentity;
  const showMissingInviteScreen = isGuestInviteFlow && guestInviteState === "missing";
  const showInviteCheckingScreen = isGuestInviteFlow && guestInviteState === "checking";
  const callExitLabel =
    inJoinFlow || !hasSignedInIdentity ? meetLabels.leaveCall : meetLabels.endCall;
  const callExitTitle =
    callExitLabel === meetLabels.leaveCall ? meetLabels.leaveCallTitle : meetLabels.endCallTitle;
  const callExitDescription =
    callExitLabel === meetLabels.leaveCall
      ? meetLabels.leaveCallDescription
      : meetLabels.endCallDescription;

  useEffect(() => {
    if (!waitingForAdmission) return;
    const id = window.setInterval(() => setKnockDots((dots) => (dots % 3) + 1), 500);
    return () => window.clearInterval(id);
  }, [waitingForAdmission]);

  useEffect(() => {
    if (!hasSignedInIdentity) return;
    const previous = previousKnockerCountRef.current;
    if (controller.knockers.length > previous) {
      playMeetKnockSound();
      toast.show(meetLabels.someoneKnocking, { severity: "info" });
    }
    previousKnockerCountRef.current = controller.knockers.length;
  }, [controller.knockers.length, hasSignedInIdentity, toast]);

  const cameras = useMemo(
    () => normalizeMeetDeviceOptions("videoinput", controller.videoInputs),
    [controller.videoInputs],
  );
  const microphones = useMemo(
    () => normalizeMeetDeviceOptions("audioinput", controller.audioInputs),
    [controller.audioInputs],
  );
  const speakers = useMemo(
    () => meetSpeakerOptionsFromAudioInputs(controller.audioInputs),
    [controller.audioInputs],
  );

  useEffect(() => {
    if (!isGuestInviteFlow || !invitedRoom) {
      setGuestInviteState("active");
      return;
    }
    if (!operations) {
      setGuestInviteState("checking");
      return;
    }
    setGuestInviteState("checking");
    void operations
      .roomStatus({ room: invitedRoom })
      .then((result) => {
        setGuestInviteState(result.active ? "active" : "missing");
      })
      .catch(() => {
        setGuestInviteState("missing");
      });
  }, [invitedRoom, isGuestInviteFlow, operations]);

  useEffect(() => {
    if (showMissingInviteScreen || showInviteCheckingScreen) return;
    void controller.ensureLocalMedia().catch(() => {
      // Keep lobby usable if the user declines camera/mic permissions.
    });
  }, [controller, showInviteCheckingScreen, showMissingInviteScreen]);

  const participantCount = controller.peers.length + (controller.inCall ? 1 : 0);
  const activeCamera = selectedMeetDeviceOptionId(cameras, controller.selectedCamId);
  const activeMic = selectedMeetDeviceOptionId(microphones, controller.selectedMicId);
  const activeSpeaker = speakerId || speakers[0]?.id || "default";

  function sendMessage() {
    const value = draft.trim();
    if (!value) return;
    void controller.sendChat(value);
    setDraft("");
  }

  function copyCallLink() {
    const link = controller.callLink;
    if (!link) return;
    void navigator.clipboard?.writeText(link);
    toast.showSuccess(meetLabels.linkCopied);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "meet-workspace flex h-dvh w-full flex-col",
          controller.inCall && "meet-workspace--in-call",
          className,
        )}
      >
        <header className="meet-workspace__header">
          <div className="flex min-w-0 items-center">
            <WorkspaceAppSwitcher disabled={disableAppSwitcher} />
          </div>
          {showUserMenu ? (
            <MeetUserMenu displayName={displayName} onLogout={onLogout} />
          ) : (
            <div className="meet-workspace__header-spacer" aria-hidden />
          )}
        </header>

        {!controller.inCall ? (
          <main className="meet-workspace__lobby">
            <MeetLobbyPane
              controller={controller}
              displayName={displayName}
              inJoinFlow={inJoinFlow}
              hasSignedInIdentity={hasSignedInIdentity}
              invitedRoom={invitedRoom}
              waitingForAdmission={waitingForAdmission}
              knockDots={knockDots}
              cameras={cameras}
              microphones={microphones}
              speakers={speakers}
              activeCamera={activeCamera}
              activeMic={activeMic}
              activeSpeaker={activeSpeaker}
              onSpeakerChange={setSpeakerId}
              endedMessage={controller.endedMessage}
              showMissingInviteScreen={showMissingInviteScreen}
              showInviteCheckingScreen={showInviteCheckingScreen}
            />
          </main>
        ) : (
          <main
            className={cn(
              "meet-workspace__room",
              chatOpen ? "meet-workspace__room--chat-open" : "meet-workspace__room--chat-closed",
            )}
          >
            <MeetRoomPane
              controller={controller}
              displayName={displayName}
              hasSignedInIdentity={hasSignedInIdentity}
              participantCount={participantCount}
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((open) => !open)}
              callExitLabel={callExitLabel}
              callExitTitle={callExitTitle}
              callExitDescription={callExitDescription}
              cameras={cameras}
              microphones={microphones}
              speakers={speakers}
              activeCamera={activeCamera}
              activeMic={activeMic}
              activeSpeaker={activeSpeaker}
              onSpeakerChange={setSpeakerId}
              onCopyLink={copyCallLink}
              onMuteSoon={(name) => toast.show(meetLabels.muteSoon(name), { severity: "info" })}
              onToastInfo={(message) => toast.show(message, { severity: "info" })}
              onToastError={(message) => toast.showError(message)}
            />
            {chatOpen ? (
              <MeetChatPane
                messages={controller.chatMessages}
                draft={draft}
                onDraftChange={setDraft}
                onSend={sendMessage}
                onClose={() => setChatOpen(false)}
              />
            ) : null}
          </main>
        )}
      </div>
    </TooltipProvider>
  );
}

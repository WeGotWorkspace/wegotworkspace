import { useEffect, useMemo, useRef, useState } from "react";
import { useAppToast } from "@/hooks/use-app-toast";
import type { MeetControllerState } from "@/meet-core/src/meet-controller-state";
import {
  meetSpeakerOptionsFromAudioInputs,
  normalizeMeetDeviceOptions,
  selectedMeetDeviceOptionId,
} from "@/meet-core/src/meet-device-utils";
import { meetLabels } from "@/meet-core/src/meet-labels";
import { playMeetKnockSound } from "@/meet-core/src/meet-chat-utils";
import type { MeetWorkspaceProps } from "@/meet-core/src/meet-workspace-props";
import { useMeetController } from "@/meet-core/src/use-meet-controller";

type MeetWorkspaceShellInput = Pick<
  MeetWorkspaceProps,
  "data" | "session" | "operations" | "invitedRoom" | "buildCallLink" | "onRoomChange"
>;

export function useMeetWorkspaceShell({
  data,
  session,
  operations,
  invitedRoom = null,
  buildCallLink,
  onRoomChange,
}: MeetWorkspaceShellInput) {
  const toast = useAppToast();
  const controller = useMeetController({
    session,
    defaultDisplayName: data.defaultDisplayName,
    rtc: data.rtc,
    operations,
    buildCallLink,
    onRoomChange,
  });

  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [speakerId, setSpeakerId] = useState("default");
  const [knockDots, setKnockDots] = useState(1);
  const previousKnockerCountRef = useRef(0);

  const hasSignedInIdentity = Boolean(session.user.username?.trim() || session.user.email?.trim());
  const displayName = controller.displayName || session.user.displayName || "Guest";
  const inJoinFlow = Boolean(invitedRoom);

  const [guestInviteState, setGuestInviteState] = useState<"checking" | "active" | "missing">(() =>
    inJoinFlow && !hasSignedInIdentity ? "checking" : "active",
  );
  const showUserAccount = hasSignedInIdentity && !inJoinFlow;
  const waitingForAdmission = controller.waitingForAdmission && inJoinFlow;
  const disableAppSwitcher = !hasSignedInIdentity || inJoinFlow;
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

  /** Host may join after the guest tab opened; keep polling until the room becomes active. */
  useEffect(() => {
    if (!isGuestInviteFlow || !invitedRoom || !operations || guestInviteState !== "missing") {
      return;
    }
    const id = window.setInterval(() => {
      void operations.roomStatus({ room: invitedRoom }).then((result) => {
        if (result.active) setGuestInviteState("active");
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, [guestInviteState, invitedRoom, isGuestInviteFlow, operations]);

  useEffect(() => {
    if (showMissingInviteScreen || showInviteCheckingScreen) return;
    void controller.ensureLocalMedia().catch(() => {
      // Keep lobby usable if the user declines camera/mic permissions.
    });
  }, [controller.ensureLocalMedia, showInviteCheckingScreen, showMissingInviteScreen]);

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

  return {
    controller,
    session,
    displayName,
    header: {
      disableAppSwitcher,
      showUserAccount,
    },
    lobby: {
      inJoinFlow,
      hasSignedInIdentity,
      invitedRoom,
      waitingForAdmission,
      knockDots,
      cameras,
      microphones,
      speakers,
      activeCamera,
      activeMic,
      activeSpeaker,
      onSpeakerChange: setSpeakerId,
      endedMessage: controller.endedMessage,
      showMissingInviteScreen,
      showInviteCheckingScreen,
    },
    room: {
      hasSignedInIdentity,
      participantCount,
      chatOpen,
      onToggleChat: () => setChatOpen((open) => !open),
      callExitLabel,
      callExitTitle,
      callExitDescription,
      cameras,
      microphones,
      speakers,
      activeCamera,
      activeMic,
      activeSpeaker,
      onSpeakerChange: setSpeakerId,
      onCopyLink: copyCallLink,
      onMuteSoon: (name: string) => toast.show(meetLabels.muteSoon(name), { severity: "info" }),
      onToastInfo: (message: string) => toast.show(message, { severity: "info" }),
      onToastError: (message: string) => toast.showError(message),
    },
    chat: {
      chatOpen,
      draft,
      onDraftChange: setDraft,
      onSend: sendMessage,
      onClose: () => setChatOpen(false),
    },
    inCall: controller.inCall,
  };
}

export type MeetWorkspaceShellState = ReturnType<typeof useMeetWorkspaceShell>;

export type MeetWorkspaceShellController = MeetControllerState;

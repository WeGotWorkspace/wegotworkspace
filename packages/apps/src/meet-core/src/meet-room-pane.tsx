import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { MeetCircleToggle } from "@/meet-core/src/meet-circle-toggle";
import { MeetDevicePopover } from "@/meet-core/src/meet-device-popover";
import { MeetKnockBadge } from "@/meet-core/src/meet-knock-badge";
import { MeetPeerTile } from "@/meet-core/src/meet-peer-tile";
import { MeetSelfPreviewPiP } from "@/meet-core/src/meet-self-preview-pip";
import { MeetShareButton, MeetShareInline } from "@/meet-core/src/meet-share";
import { MeetStreamVideo } from "@/meet-core/src/meet-stream-video";
import type { MeetDeviceOption } from "@/meet-core/src/meet-device-utils";
import { meetLabels } from "@/meet-core/src/meet-labels";
import type { useMeetController } from "@/meet-core/src/use-meet-controller";
import { cn } from "@/lib/utils";

type MeetController = ReturnType<typeof useMeetController>;

type MeetRoomPaneProps = {
  controller: MeetController;
  displayName: string;
  hasSignedInIdentity: boolean;
  participantCount: number;
  chatOpen: boolean;
  onToggleChat: () => void;
  callExitLabel: string;
  callExitTitle: string;
  callExitDescription: string;
  cameras: MeetDeviceOption[];
  microphones: MeetDeviceOption[];
  speakers: MeetDeviceOption[];
  activeCamera: string;
  activeMic: string;
  activeSpeaker: string;
  onSpeakerChange: (value: string) => void;
  onCopyLink: () => void;
  onMuteSoon: (name: string) => void;
  onToastInfo: (message: string) => void;
  onToastError: (message: string) => void;
};

function peerGridClass(count: number) {
  if (count <= 1) return "meet-workspace__peer-grid--1";
  if (count === 2) return "meet-workspace__peer-grid--2";
  return "meet-workspace__peer-grid--4";
}

export function MeetRoomPane({
  controller,
  displayName,
  hasSignedInIdentity,
  participantCount,
  chatOpen,
  onToggleChat,
  callExitLabel,
  callExitTitle,
  callExitDescription,
  cameras,
  microphones,
  speakers,
  activeCamera,
  activeMic,
  activeSpeaker,
  onSpeakerChange,
  onCopyLink,
  onMuteSoon,
  onToastInfo,
  onToastError,
}: MeetRoomPaneProps) {
  const sharing = controller.screenOn;

  return (
    <div className="meet-workspace__room-main">
      <div className="meet-workspace__status-bar">
        <div className="flex items-center gap-3">
          <span className="meet-workspace__live-dot" />
          <span className="text-sm font-medium tabular-nums">{controller.elapsedLabel}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="meet-workspace__participant-count">
                <Users className="size-3.5" />
                {participantCount}/4
              </span>
            </TooltipTrigger>
            <TooltipContent>{meetLabels.participantsTooltip(participantCount)}</TooltipContent>
          </Tooltip>
        </div>
        <div className="meet-workspace__status-actions">
          {hasSignedInIdentity && controller.knockers.length > 0 ? (
            <MeetKnockBadge
              knockers={controller.knockers}
              onAdmit={(peerId) => void controller.admitKnocker(peerId)}
              onDeny={(peerId) => void controller.denyKnocker(peerId)}
            />
          ) : null}
          <MeetShareButton link={controller.callLink} onCopy={onCopyLink} />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleChat}
                className={cn(
                  "meet-workspace__icon-button hidden lg:inline-flex",
                  chatOpen && "meet-workspace__icon-button--active",
                )}
                aria-label={chatOpen ? meetLabels.toggleChatHide : meetLabels.toggleChatShow}
              >
                <MessageSquare className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {chatOpen ? meetLabels.toggleChatHide : meetLabels.toggleChatShow}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="meet-workspace__stage">
        <div className="meet-workspace__stage-inner">
          {sharing ? (
            <div className="meet-workspace__share-layout">
              <div className="meet-workspace__screen-stage">
                {controller.screenPreviewStream ? (
                  <MeetStreamVideo stream={controller.screenPreviewStream} className="h-full w-full object-cover" />
                ) : (
                  <div className="meet-workspace__muted flex h-full items-center justify-center text-sm">
                    <MonitorUp className="mr-2 size-4" /> {meetLabels.sharingScreen}
                  </div>
                )}
                <div className="meet-workspace__presenting-badge">{meetLabels.presenting}</div>
              </div>
              {controller.peers.length > 0 ? (
                <div className="meet-workspace__peer-strip">
                  {controller.peers.map((peer) => (
                    <MeetPeerTile
                      key={peer.id}
                      name={peer.name}
                      stream={peer.stream}
                      compact
                      onMuteSoon={onMuteSoon}
                    />
                  ))}
                </div>
              ) : (
                <div className="meet-workspace__empty-stage">
                  <span>{meetLabels.waitingForOthers}</span>
                  <MeetShareInline link={controller.callLink} onCopy={onCopyLink} />
                </div>
              )}
            </div>
          ) : controller.peers.length > 0 ? (
            <div className={cn("meet-workspace__peer-grid", peerGridClass(controller.peers.length))}>
              {controller.peers.map((peer) => (
                <MeetPeerTile
                  key={peer.id}
                  name={peer.name}
                  stream={peer.stream}
                  onMuteSoon={onMuteSoon}
                />
              ))}
            </div>
          ) : (
            <div className="meet-workspace__empty-stage h-full">
              <span>{meetLabels.waitingForOthers}</span>
              <MeetShareInline link={controller.callLink} onCopy={onCopyLink} />
            </div>
          )}

          <MeetSelfPreviewPiP
            name={displayName}
            videoOn={controller.videoOn}
            micOn={controller.micOn}
            videoRef={controller.localVideoRef}
            onInfo={onToastInfo}
            onError={onToastError}
          />
        </div>
      </div>

      <div className="meet-workspace__toolbar">
        <div className="meet-workspace__toolbar-inner">
          <MeetCircleToggle
            on={controller.micOn}
            onClick={controller.toggleMic}
            OnIcon={Mic}
            OffIcon={MicOff}
            label={controller.micOn ? "Mute" : "Unmute"}
            large
          />
          <MeetCircleToggle
            on={controller.videoOn}
            onClick={controller.toggleVideo}
            OnIcon={Video}
            OffIcon={VideoOff}
            label={controller.videoOn ? "Stop video" : "Start video"}
            large
          />
          <MeetDevicePopover
            cameras={cameras}
            microphones={microphones}
            speakers={speakers}
            camera={activeCamera}
            microphone={activeMic}
            speaker={activeSpeaker}
            onCamera={(id) => {
              const deviceId = cameras.find((option) => option.id === id)?.deviceId;
              if (!deviceId) return;
              void controller.switchCamera(deviceId);
            }}
            onMicrophone={(id) => {
              const deviceId = microphones.find((option) => option.id === id)?.deviceId;
              if (!deviceId) return;
              void controller.switchMic(deviceId);
            }}
            onSpeaker={onSpeakerChange}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void controller.toggleScreenShare()}
                className={cn(
                  "meet-workspace__screen-share-button",
                  controller.screenOn && "meet-workspace__screen-share-button--active",
                )}
                aria-label={meetLabels.shareScreen}
              >
                <MonitorUp className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {controller.screenOn ? meetLabels.stopSharing : meetLabels.shareScreen}
            </TooltipContent>
          </Tooltip>
          <div className="meet-workspace__toolbar-divider" />
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button type="button" className="meet-workspace__hangup-button" aria-label={callExitLabel}>
                    <PhoneOff className="size-5" />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>{callExitLabel}</TooltipContent>
            </Tooltip>
            <AlertDialogContent className="meet-dialog-surface">
              <AlertDialogHeader>
                <AlertDialogTitle>{callExitTitle}</AlertDialogTitle>
                <AlertDialogDescription>{callExitDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    void (callExitLabel === meetLabels.endCall
                      ? controller.endCallForAll()
                      : controller.leave())
                  }
                  className="meet-workspace__hangup-button"
                >
                  {callExitLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

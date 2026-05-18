import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
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
import type { MeetDeviceOption } from "@/meet-core/src/meet-device-utils";
import { meetLabels } from "@/meet-core/src/meet-labels";
import { cn } from "@/lib/utils";

type MeetCallToolbarProps = {
  micOn: boolean;
  videoOn: boolean;
  screenOn: boolean;
  callExitLabel: string;
  callExitTitle: string;
  callExitDescription: string;
  cameras: MeetDeviceOption[];
  microphones: MeetDeviceOption[];
  speakers: MeetDeviceOption[];
  activeCamera: string;
  activeMic: string;
  activeSpeaker: string;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onCameraChange: (optionId: string) => void;
  onMicrophoneChange: (optionId: string) => void;
  onSpeakerChange: (optionId: string) => void;
  onConfirmExit: () => void;
};

export function MeetCallToolbar({
  micOn,
  videoOn,
  screenOn,
  callExitLabel,
  callExitTitle,
  callExitDescription,
  cameras,
  microphones,
  speakers,
  activeCamera,
  activeMic,
  activeSpeaker,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onCameraChange,
  onMicrophoneChange,
  onSpeakerChange,
  onConfirmExit,
}: MeetCallToolbarProps) {
  return (
    <div className="meet-workspace__toolbar">
      <div className="meet-workspace__toolbar-inner">
        <MeetCircleToggle
          on={micOn}
          onClick={onToggleMic}
          OnIcon={Mic}
          OffIcon={MicOff}
          label={micOn ? "Mute" : "Unmute"}
          large
        />
        <MeetCircleToggle
          on={videoOn}
          onClick={onToggleVideo}
          OnIcon={Video}
          OffIcon={VideoOff}
          label={videoOn ? "Stop video" : "Start video"}
          large
        />
        <MeetDevicePopover
          cameras={cameras}
          microphones={microphones}
          speakers={speakers}
          camera={activeCamera}
          microphone={activeMic}
          speaker={activeSpeaker}
          onCamera={onCameraChange}
          onMicrophone={onMicrophoneChange}
          onSpeaker={onSpeakerChange}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={cn(
                "meet-workspace__screen-share-button",
                screenOn && "meet-workspace__screen-share-button--active",
              )}
              aria-label={meetLabels.shareScreen}
            >
              <MonitorUp className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {screenOn ? meetLabels.stopSharing : meetLabels.shareScreen}
          </TooltipContent>
        </Tooltip>
        <div className="meet-workspace__toolbar-divider" aria-hidden />
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="meet-workspace__hangup-button"
                  aria-label={callExitLabel}
                >
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
                onClick={onConfirmExit}
                className="meet-dialog-surface__confirm-exit"
              >
                {callExitLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

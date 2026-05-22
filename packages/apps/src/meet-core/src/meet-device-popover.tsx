import { Settings as SettingsIcon } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { MeetDeviceForm } from "@/meet-core/src/meet-device-form";
import { meetLabels } from "@/meet-core/src/meet-labels";
import type { MeetDeviceOption } from "@/meet-core/src/meet-device-utils";

type MeetDevicePopoverProps = {
  cameras: MeetDeviceOption[];
  microphones: MeetDeviceOption[];
  speakers: MeetDeviceOption[];
  camera: string;
  microphone: string;
  speaker: string;
  onCamera: (value: string) => void;
  onMicrophone: (value: string) => void;
  onSpeaker: (value: string) => void;
  /** Storybook: start with the device sheet open. */
  defaultOpen?: boolean;
};

export function MeetDevicePopover({
  cameras,
  microphones,
  speakers,
  camera,
  microphone,
  speaker,
  onCamera,
  onMicrophone,
  onSpeaker,
  defaultOpen,
}: MeetDevicePopoverProps) {
  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger asChild>
        <IconButton icon={<SettingsIcon />} label={meetLabels.devices} size="lg" variant="subtle" />
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="meet-popover-surface w-80 p-3">
        <MeetDeviceForm
          cameras={cameras}
          microphones={microphones}
          speakers={speakers}
          camera={camera}
          microphone={microphone}
          speaker={speaker}
          onCameraChange={onCamera}
          onMicrophoneChange={onMicrophone}
          onSpeakerChange={onSpeaker}
        />
      </PopoverContent>
    </Popover>
  );
}

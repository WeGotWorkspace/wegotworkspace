import { Mic, Settings as SettingsIcon, Video } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { MeetDeviceRow } from "@/meet-core/src/meet-device-row";
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
}: MeetDevicePopoverProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="meet-circle-toggle meet-circle-toggle--lg meet-circle-toggle--on"
              aria-label={meetLabels.devices}
            >
              <SettingsIcon className="size-5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{meetLabels.devices}</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="center" className="meet-popover-surface w-80 p-3">
        <div className="space-y-3">
          <MeetDeviceRow
            icon={<Video />}
            label={meetLabels.cameraLabel}
            value={camera}
            onChange={onCamera}
            options={cameras}
          />
          <MeetDeviceRow
            icon={<Mic />}
            label={meetLabels.microphoneLabel}
            value={microphone}
            onChange={onMicrophone}
            options={microphones}
          />
          <MeetDeviceRow
            icon={<SettingsIcon />}
            label={meetLabels.speakerLabel}
            value={speaker}
            onChange={onSpeaker}
            options={speakers}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

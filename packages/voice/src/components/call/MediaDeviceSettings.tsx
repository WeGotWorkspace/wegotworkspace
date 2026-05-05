import type { MediaDeviceOption } from "@/hooks/use-mesh";
import { Label } from "@wgw/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wgw/ui";
import { cn } from "@wgw/ui";

const DEFAULT_VALUE = "__default__";

function selectValueForMic(inputs: MediaDeviceOption[], selectedMicId: string | null): string {
  if (selectedMicId == null) {
    return DEFAULT_VALUE;
  }
  const opt = inputs.find((d) => d.deviceId === selectedMicId);

  return opt?.selectValue ?? DEFAULT_VALUE;
}

function selectValueForCam(inputs: MediaDeviceOption[], selectedCamId: string | null): string {
  if (selectedCamId == null) {
    return DEFAULT_VALUE;
  }
  const opt = inputs.find((d) => d.deviceId === selectedCamId);

  return opt?.selectValue ?? DEFAULT_VALUE;
}

interface Props {
  audioInputs: MediaDeviceOption[];
  videoInputs: MediaDeviceOption[];
  selectedMicId: string | null;
  selectedCamId: string | null;
  onMicChange: (deviceId: string | null) => void | Promise<void>;
  onCamChange: (deviceId: string | null) => void | Promise<void>;
  /** Sidebar strip vs compact block (e.g. inside a popover). */
  surface?: "sidebar" | "popover";
  className?: string;
}

export function MediaDeviceSettings({
  audioInputs,
  videoInputs,
  selectedMicId,
  selectedCamId,
  onMicChange,
  onCamChange,
  surface = "sidebar",
  className,
}: Props) {
  const micValue = selectValueForMic(audioInputs, selectedMicId);
  const camValue = selectValueForCam(videoInputs, selectedCamId);

  return (
    <div
      className={cn(
        "space-y-4 shrink-0",
        surface === "sidebar" && "px-7 pb-4 border-b border-border/60",
        surface === "popover" && "min-w-[260px]",
        className,
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
        Microphone & camera
      </div>
      <div className="space-y-2">
        <Label htmlFor="voice-mic" className="text-xs font-semibold">
          Microphone
        </Label>
        <Select
          value={micValue}
          onValueChange={(v) => {
            if (v === DEFAULT_VALUE) {
              void onMicChange(null);
              return;
            }
            const opt = audioInputs.find((d) => d.selectValue === v);
            void onMicChange(opt ? opt.deviceId : null);
          }}
        >
          <SelectTrigger id="voice-mic" className="rounded-2xl h-10 text-xs w-full">
            <SelectValue placeholder="Select microphone" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value={DEFAULT_VALUE} className="text-xs rounded-xl">
              System default
            </SelectItem>
            {audioInputs.map((d) => (
              <SelectItem key={d.selectValue} value={d.selectValue} className="text-xs rounded-xl">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="voice-cam" className="text-xs font-semibold">
          Camera
        </Label>
        <Select
          value={camValue}
          onValueChange={(v) => {
            if (v === DEFAULT_VALUE) {
              void onCamChange(null);
              return;
            }
            const opt = videoInputs.find((d) => d.selectValue === v);
            void onCamChange(opt ? opt.deviceId : null);
          }}
        >
          <SelectTrigger id="voice-cam" className="rounded-2xl h-10 text-xs w-full">
            <SelectValue placeholder="Select camera" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value={DEFAULT_VALUE} className="text-xs rounded-xl">
              System default
            </SelectItem>
            {videoInputs.map((d) => (
              <SelectItem key={d.selectValue} value={d.selectValue} className="text-xs rounded-xl">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

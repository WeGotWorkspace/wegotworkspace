import type { MediaDeviceOption } from "@/hooks/use-mesh";
import { MediaDeviceSettings } from "@/components/call/MediaDeviceSettings";
import { Popover, PopoverContent, PopoverTrigger } from "@wgw/ui";
import { Mic, MicOff, Settings2, Video, VideoOff, MonitorUp, PhoneOff } from "lucide-react";
import { cn } from "@wgw/ui";

interface Props {
  micOn: boolean;
  camOn: boolean;
  screenOn: boolean;
  inCall: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onHangup: () => void;
  audioInputs: MediaDeviceOption[];
  videoInputs: MediaDeviceOption[];
  selectedMicId: string | null;
  selectedCamId: string | null;
  onMicChange: (deviceId: string | null) => void | Promise<void>;
  onCamChange: (deviceId: string | null) => void | Promise<void>;
}

function CtrlBtn({
  active,
  onClick,
  label,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "group flex flex-col items-center justify-center size-14 rounded-3xl transition-all",
        "border border-transparent disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-primary text-primary-foreground shadow-sm border-primary/25 hover:bg-primary/90"
          : "bg-muted text-foreground border-border/50 hover:bg-muted/80",
      )}
    >
      {children}
      <span className="hidden sm:block text-[9px] font-bold tracking-wider mt-0.5 uppercase">
        {label}
      </span>
    </button>
  );
}

export function ControlsDock({
  micOn,
  camOn,
  screenOn,
  inCall,
  onToggleMic,
  onToggleCam,
  onToggleScreen,
  onHangup,
  audioInputs,
  videoInputs,
  selectedMicId,
  selectedCamId,
  onMicChange,
  onCamChange,
}: Props) {
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-2 bg-card/90 backdrop-blur-xl p-3 rounded-[2rem] soft-shadow-lg border border-border/60">
        <Popover modal={false}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Microphone & camera"
              aria-label="Microphone and camera devices"
              className={cn(
                "group flex flex-col items-center justify-center size-14 rounded-3xl transition-all",
                "border border-border/50 bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              <Settings2 className="size-4" />
              <span className="hidden sm:block text-[9px] font-bold tracking-wider mt-0.5 uppercase">
                Devices
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="w-auto max-w-[min(100vw-2rem,22rem)] p-4 rounded-2xl"
          >
            <MediaDeviceSettings
              surface="popover"
              audioInputs={audioInputs}
              videoInputs={videoInputs}
              selectedMicId={selectedMicId}
              selectedCamId={selectedCamId}
              onMicChange={onMicChange}
              onCamChange={onCamChange}
            />
          </PopoverContent>
        </Popover>
        <CtrlBtn
          active={micOn}
          onClick={onToggleMic}
          label={micOn ? "Mic" : "Muted"}
          disabled={!inCall}
        >
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </CtrlBtn>
        <CtrlBtn
          active={camOn}
          onClick={onToggleCam}
          label={camOn ? "Video" : "Off"}
          disabled={!inCall}
        >
          {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </CtrlBtn>
        <button
          onClick={onToggleScreen}
          disabled={!inCall}
          aria-label={screenOn ? "Stop sharing screen" : "Share screen"}
          className={cn(
            "flex items-center gap-0 sm:gap-2 px-4 sm:px-5 h-14 rounded-3xl text-xs font-bold tracking-wide transition-all border",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            screenOn
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted hover:bg-muted/80 text-foreground border-border/50",
          )}
        >
          <MonitorUp className="size-4" />
          <span className="hidden sm:inline">{screenOn ? "SHARING" : "SHARE"}</span>
        </button>
        <div className="w-px h-8 bg-border mx-1" />
        <button
          onClick={onHangup}
          disabled={!inCall}
          aria-label="End call"
          className="flex items-center gap-0 sm:gap-2 px-4 sm:px-5 h-14 rounded-3xl bg-destructive text-destructive-foreground text-xs font-bold tracking-wide hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PhoneOff className="size-4" />
          <span className="hidden sm:inline">END</span>
        </button>
      </div>
    </div>
  );
}

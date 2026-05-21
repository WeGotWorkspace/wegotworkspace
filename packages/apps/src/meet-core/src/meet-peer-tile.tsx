import { useCallback, useEffect, useState } from "react";
import { Mic, MicOff, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { shouldMirrorMeetStream } from "@/meet-core/src/meet-stream-mirror";
import { MeetStreamVideo } from "@/meet-core/src/meet-stream-video";
import { meetLabels } from "@/meet-core/src/meet-labels";
import { usePeerStreamPresence } from "@/meet-core/src/use-peer-stream-presence";
import { cn } from "@/lib/utils";

type MeetPeerTileProps = {
  name: string;
  stream: MediaStream | null;
  compact?: boolean;
  /** Inbound RTP heuristics; null = omit override. */
  remoteMedia?: { camera: boolean; mic: boolean } | null;
  /** Peer's announced mic/camera (control chat); when set, overrides track/stats for UI. */
  disclosedMedia?: { camera: boolean; mic: boolean; screen?: boolean } | null;
  onMuteSoon: (name: string) => void;
};

export function MeetPeerTile({
  name,
  stream,
  compact,
  remoteMedia,
  disclosedMedia,
  onMuteSoon,
}: MeetPeerTileProps) {
  const { cameraRendering, micLive } = usePeerStreamPresence(stream);
  const [remoteVideoOk, setRemoteVideoOk] = useState(true);

  const onPresentationViable = useCallback((viable: boolean) => {
    setRemoteVideoOk(viable);
  }, []);

  useEffect(() => {
    setRemoteVideoOk(true);
  }, [cameraRendering, disclosedMedia?.camera, stream]);

  const statsAllowCamera = remoteMedia?.camera !== false;
  const statsAllowMic = remoteMedia?.mic !== false;
  const cameraFromTracks = cameraRendering && statsAllowCamera;
  const micFromTracks = micLive && statsAllowMic;

  const showRemoteVideo = !!(stream && (disclosedMedia ? disclosedMedia.camera : cameraFromTracks));
  const micLiveUi = disclosedMedia ? disclosedMedia.mic : micFromTracks;
  const showAvatarFill = !showRemoteVideo || !remoteVideoOk;
  const mirrored = shouldMirrorMeetStream(stream, disclosedMedia?.screen);

  return (
    <div className={cn("meet-peer-tile", compact && "meet-peer-tile--compact")}>
      {showRemoteVideo ? (
        <div className="meet-peer-tile__media">
          <MeetStreamVideo
            stream={stream}
            mirrored={mirrored}
            onPresentationViable={onPresentationViable}
            className={cn(
              "meet-peer-tile__stream h-full w-full",
              !remoteVideoOk && "meet-peer-tile__stream--hidden",
            )}
          />
          {showAvatarFill ? (
            <div className="meet-peer-tile__fill">
              <UserAvatar displayName={name} compact size={compact ? "md" : "lg"} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="meet-peer-tile__fill">
          <UserAvatar displayName={name} compact size={compact ? "md" : "lg"} />
        </div>
      )}
      <div className={cn("meet-peer-tile__name", !micLiveUi && "meet-peer-tile__name--mic-muted")}>
        {micLiveUi ? <Mic className="size-3" /> : <MicOff className="size-3 text-red-400" />}
        <span>{name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="meet-peer-tile__menu" aria-label={`Actions for ${name}`}>
            <MoreVertical className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="meet-menu-surface">
          <DropdownMenuItem className="cursor-pointer" onClick={() => onMuteSoon(name)}>
            <MicOff className="mr-2 size-4" /> {meetLabels.muteParticipant}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

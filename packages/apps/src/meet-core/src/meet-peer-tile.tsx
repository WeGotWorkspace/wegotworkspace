import { Mic, MicOff, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { MeetAvatar } from "@/meet-core/src/meet-avatar";
import { MeetStreamVideo } from "@/meet-core/src/meet-stream-video";
import { meetLabels } from "@/meet-core/src/meet-labels";
import { cn } from "@/lib/utils";

type MeetPeerTileProps = {
  name: string;
  stream: MediaStream | null;
  compact?: boolean;
  onMuteSoon: (name: string) => void;
};

export function MeetPeerTile({ name, stream, compact, onMuteSoon }: MeetPeerTileProps) {
  return (
    <div className={cn("meet-peer-tile", compact && "meet-peer-tile--compact")}>
      {stream ? (
        <MeetStreamVideo stream={stream} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <MeetAvatar name={name} size={compact ? 40 : 80} />
        </div>
      )}
      <div className="meet-peer-tile__name">
        <Mic className="size-3" />
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

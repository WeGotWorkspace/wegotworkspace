import { MessageSquare, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { MeetKnockBadge } from "@/meet-core/src/meet-knock-badge";
import { MeetShareButton } from "@/meet-core/src/meet-share";
import { meetLabels } from "@/meet-core/src/meet-labels";
import { cn } from "@/lib/utils";

type MeetKnocker = { id: string; name: string };

type MeetRoomStatusBarProps = {
  elapsedLabel: string;
  participantCount: number;
  callLink: string;
  knockers: MeetKnocker[];
  showKnockers: boolean;
  chatOpen: boolean;
  onToggleChat: () => void;
  onCopyLink: () => void;
  onAdmitKnocker: (peerId: string) => void;
  onDenyKnocker: (peerId: string) => void;
};

export function MeetRoomStatusBar({
  elapsedLabel,
  participantCount,
  callLink,
  knockers,
  showKnockers,
  chatOpen,
  onToggleChat,
  onCopyLink,
  onAdmitKnocker,
  onDenyKnocker,
}: MeetRoomStatusBarProps) {
  return (
    <div className="meet-workspace__status-bar">
      <div className="flex items-center gap-3">
        <span className="meet-workspace__live-dot" />
        <span className="text-sm font-medium tabular-nums">{elapsedLabel}</span>
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
        {showKnockers && knockers.length > 0 ? (
          <MeetKnockBadge knockers={knockers} onAdmit={onAdmitKnocker} onDeny={onDenyKnocker} />
        ) : null}
        <MeetShareButton link={callLink} onCopy={onCopyLink} />
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
  );
}

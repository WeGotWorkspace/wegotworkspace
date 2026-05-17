import { Check, Hand, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { MeetAvatar } from "@/meet-core/src/meet-avatar";
import { meetLabels } from "@/meet-core/src/meet-labels";

type MeetKnocker = { id: string; name: string };

type MeetKnockBadgeProps = {
  knockers: MeetKnocker[];
  onAdmit: (peerId: string) => void;
  onDeny: (peerId: string) => void;
};

export function MeetKnockBadge({ knockers, onAdmit, onDeny }: MeetKnockBadgeProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="meet-knock-badge"
              aria-label={meetLabels.waitingToJoin(knockers.length)}
            >
              <Hand className="size-4" />
              <span className="meet-knock-badge__count">{knockers.length}</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{meetLabels.waitingToJoin(knockers.length)}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="meet-popover-surface w-80 p-2">
        <div className="space-y-1">
          {knockers.map((knocker) => (
            <div key={knocker.id} className="meet-knock-row">
              <MeetAvatar name={knocker.name} size={36} />
              <div className="flex-1">
                <div className="text-sm font-medium">{knocker.name}</div>
                <div className="text-[11px]" style={{ color: "var(--meet-muted)" }}>
                  {meetLabels.wantsToJoin}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeny(knocker.id)}
                className="meet-knock-row__deny"
                aria-label={`Deny ${knocker.name}`}
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onAdmit(knocker.id)}
                className="meet-knock-row__admit"
                aria-label={`Admit ${knocker.name}`}
              >
                <Check className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

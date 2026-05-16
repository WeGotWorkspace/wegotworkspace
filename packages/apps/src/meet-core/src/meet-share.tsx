import { Copy, Link as LinkIcon } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { meetLabels } from "@/meet-core/src/meet-labels";

type MeetShareButtonProps = {
  link: string;
  onCopy: () => void;
};

export function MeetShareButton({ link, onCopy }: MeetShareButtonProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button type="button" className="meet-workspace__icon-button" aria-label={meetLabels.shareLink}>
              <LinkIcon className="size-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{meetLabels.shareLink}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="meet-popover-surface w-96 p-3">
        <div className="space-y-2">
          <div className="text-xs" style={{ color: "var(--meet-muted)" }}>
            {meetLabels.shareLinkHint}
          </div>
          <div className="meet-share-field">
            <span className="flex-1 truncate text-sm">
              {link || meetLabels.shareLinkPlaceholder}
            </span>
            <IconButton
              className="size-7"
              disabled={!link}
              onClick={onCopy}
              label={meetLabels.copyLink}
              icon={<Copy />}
              showTooltip={false}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type MeetShareInlineProps = {
  link: string;
  onCopy: () => void;
};

export function MeetShareInline({ link, onCopy }: MeetShareInlineProps) {
  return (
    <div className="meet-share-inline">
      <div className="flex items-center gap-3">
        <span className="flex-1 truncate text-sm">{link || meetLabels.shareLinkWaiting}</span>
        <IconButton
          className="size-8"
          disabled={!link}
          onClick={onCopy}
          label={meetLabels.copyLink}
          icon={<Copy />}
          showTooltip={false}
        />
      </div>
    </div>
  );
}

import { MoreHorizontal } from "lucide-react";
import { Button } from "@wgw/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@wgw/ui";
import { cn } from "@wgw/ui";

export function FileItemMenu({
  onRename,
  onDelete,
  onToggleStar,
  starred,
  disabled,
  triggerClassName,
}: {
  onRename?: () => void;
  onDelete?: () => void;
  onToggleStar?: () => void;
  starred?: boolean;
  disabled?: boolean;
  /** e.g. list row: keep hover fade-in */
  triggerClassName?: string;
}) {
  if (!onRename && !onToggleStar && !onDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 shrink-0", triggerClassName)}
          type="button"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        {onToggleStar ? (
          <DropdownMenuItem disabled={disabled} onSelect={() => onToggleStar()}>
            {starred ? "Remove from starred" : "Add to starred"}
          </DropdownMenuItem>
        ) : null}
        {onRename ? (
          <DropdownMenuItem disabled={disabled} onSelect={() => onRename()}>
            Rename…
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem
            disabled={disabled}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onSelect={() => onDelete()}
          >
            Delete…
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

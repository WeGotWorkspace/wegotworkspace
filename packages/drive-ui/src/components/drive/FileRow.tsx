import { Star } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { FileItemMenu } from "./FileItemMenu";
import type { DriveFile } from "@/lib/files";
import { formatRelative } from "@/lib/files";
import { cn } from "@/lib/utils";

export function FileRow({
  file,
  selected,
  onClick,
  onOpenInOffice,
  onRenameRequest,
  onDeleteRequest,
  onToggleStar,
}: {
  file: DriveFile;
  selected?: boolean;
  onClick?: () => void;
  onOpenInOffice?: () => void;
  onRenameRequest?: (file: DriveFile) => void;
  onDeleteRequest?: (file: DriveFile) => void;
  onToggleStar?: (file: DriveFile) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onOpenInOffice?.();
      }}
      className={cn(
        "group grid grid-cols-[minmax(0,1fr)_40px] md:grid-cols-[minmax(0,1fr)_160px_120px_100px_40px] items-center gap-2.5 md:gap-4 px-2.5 md:px-3.5 py-2 md:py-2.5 text-left rounded-lg w-full cursor-default",
        "transition-colors",
        selected ? "bg-accent" : "hover:bg-muted/60",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileIcon kind={file.kind} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{file.name}</span>
            {file.starred && <Star className="h-3.5 w-3.5 fill-slide text-slide shrink-0" />}
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 min-w-0">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-[10px] font-semibold shrink-0">
          {file.owner.avatar}
        </div>
        <span className="text-sm text-muted-foreground truncate">{file.owner.name}</span>
      </div>

      <span className="hidden md:inline text-sm text-muted-foreground">{formatRelative(file.modified)}</span>
      <span className="hidden md:inline text-sm text-muted-foreground tabular-nums">{file.size ?? "—"}</span>

      <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <FileItemMenu
          onRename={onRenameRequest ? () => onRenameRequest(file) : undefined}
          onDelete={onDeleteRequest ? () => onDeleteRequest(file) : undefined}
          onToggleStar={onToggleStar ? () => onToggleStar(file) : undefined}
          starred={file.starred}
          triggerClassName="opacity-0 group-hover:opacity-100"
        />
      </div>
    </div>
  );
}

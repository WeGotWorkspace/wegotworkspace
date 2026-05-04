import { Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { FileIcon } from "./FileIcon";
import { FileItemMenu } from "./FileItemMenu";
import type { DriveFile } from "@/lib/files";
import { formatRelative } from "@/lib/files";
import { driveDownloadBlob } from "@/lib/driveApi";
import { cn } from "@/lib/utils";

interface Props {
  file: DriveFile;
  selected?: boolean;
  onClick?: () => void;
  /** Double-click: images open in a new tab; Office types open in OnlyOffice when the path allows. */
  onOpenInOffice?: () => void;
  onRenameRequest?: (file: DriveFile) => void;
  onDeleteRequest?: (file: DriveFile) => void;
  onToggleStar?: (file: DriveFile) => void;
}

export function FileCard({ file, selected, onClick, onOpenInOffice, onRenameRequest, onDeleteRequest, onToggleStar }: Props) {
  const isImage = file.kind === "image";
  const [imgFailed, setImgFailed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setImgFailed(false);
    setPreviewUrl(null);
  }, [file.id]);

  useEffect(() => {
    if (!isImage || imgFailed) {
      return;
    }
    let cancelled = false;
    let urlToRevoke: string | null = null;
    void driveDownloadBlob(file.path)
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        urlToRevoke = objectUrl;
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setImgFailed(true);
      });
    return () => {
      cancelled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [file.path, isImage, imgFailed]);

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
        "group relative flex flex-col text-left rounded-xl border bg-surface overflow-hidden cursor-default",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        selected ? "ring-2 ring-ring border-ring" : "border-border hover:border-foreground/20",
      )}
    >
      {/* Preview area */}
      <div
        className={cn(
          "relative h-32 w-full overflow-hidden",
          !isImage || imgFailed ? "bg-gradient-to-br from-muted/40 to-muted" : "bg-muted/15",
        )}
      >
        {isImage && !imgFailed && previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileIcon kind={file.kind} size="lg" />
          </div>
        )}
        {file.starred && (
          <div className="absolute top-2 left-2 rounded-md bg-background/80 backdrop-blur p-1">
            <Star className="h-3.5 w-3.5 fill-slide text-slide" />
          </div>
        )}
        {onRenameRequest || onDeleteRequest || onToggleStar ? (
          <div
            className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <FileItemMenu
              triggerClassName="bg-background/80 backdrop-blur hover:bg-background"
              onRename={onRenameRequest ? () => onRenameRequest(file) : undefined}
              onDelete={onDeleteRequest ? () => onDeleteRequest(file) : undefined}
              onToggleStar={onToggleStar ? () => onToggleStar(file) : undefined}
              starred={file.starred}
            />
          </div>
        ) : null}
      </div>

      {/* Meta */}
      <div className="flex items-start gap-2.5 p-3 border-t border-border/60">
        <FileIcon kind={file.kind} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{file.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatRelative(file.modified)}</span>
            {file.size && (
              <>
                <span>·</span>
                <span>{file.size}</span>
              </>
            )}
          </div>
        </div>
        {file.shared && file.shared.length > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
            <Users className="h-3 w-3" />
            <span className="text-xs">{file.shared.length + 1}</span>
          </div>
        )}
      </div>
    </div>
  );
}

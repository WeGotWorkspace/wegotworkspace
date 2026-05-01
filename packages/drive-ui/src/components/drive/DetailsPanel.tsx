import type { ElementType } from "react";
import { useEffect, useState } from "react";
import { X, Download, Link2, Trash2, Star, Clock, HardDrive, User, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileIcon } from "./FileIcon";
import type { DriveFile } from "@/lib/files";
import { formatRelative } from "@/lib/files";
import { driveDownloadBlob, driveDownloadFile, driveOpenInNewTab } from "@/lib/driveApi";
import { officeEditorHref } from "@/lib/officeLink";
import { cn } from "@/lib/utils";

export function DetailsPanel({
  file,
  onClose,
  onOpenInOffice,
  onToggleStar,
  onDeleteRequest,
}: {
  file: DriveFile;
  onClose: () => void;
  /** When set, used instead of opening directly (e.g. to record recent). */
  onOpenInOffice?: () => void;
  onToggleStar?: () => void;
  onDeleteRequest?: () => void;
}) {
  const isImage = file.kind === "image";
  const [imgFailed, setImgFailed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const officeHref = officeEditorHref(file.path);
  const canOpen = isImage || Boolean(officeHref);

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
    <aside className="w-[340px] shrink-0 border-l border-border bg-sidebar flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <span className="text-sm font-semibold">Details</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" type="button" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "h-44 m-5 rounded-xl border border-border flex items-center justify-center overflow-hidden",
            isImage && !imgFailed ? "bg-muted/15" : "",
          )}
          style={!isImage || imgFailed ? { background: "var(--gradient-subtle)" } : undefined}
        >
          {isImage && !imgFailed && previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-contain"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <FileIcon kind={file.kind} size="lg" />
          )}
        </div>

        <div className="px-5">
          <h3 className="text-base font-semibold leading-tight break-words">{file.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {file.kind} · {file.size ?? "—"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 mt-5">
          <button
            type="button"
            disabled={!canOpen}
            title={
              isImage
                ? "Open image in new tab"
                : officeHref
                  ? "Open in OnlyOffice"
                  : "Only .docx, .xlsx, .pptx, or .pdf under users/ or groups/"
            }
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
            onClick={() => {
              if (!canOpen) return;
              if (isImage) {
                void driveOpenInNewTab(file.path);
              } else if (onOpenInOffice) onOpenInOffice();
              else if (officeHref) window.open(officeHref, "_blank", "noopener,noreferrer");
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="text-[10px] font-medium">Open</span>
          </button>
          <button
            type="button"
            title="Download"
            disabled={file.kind === "folder"}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
            onClick={() => {
              if (file.kind === "folder") return;
              void driveDownloadFile(file.path, file.name);
            }}
          >
            <Download className="h-4 w-4" />
            <span className="text-[10px] font-medium">Download</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
            onClick={() => onToggleStar?.()}
            disabled={!onToggleStar}
          >
            <Star className={cn("h-4 w-4", file.starred && "fill-slide text-slide")} />
            <span className="text-[10px] font-medium">{file.starred ? "Starred" : "Star"}</span>
          </button>
        </div>

        <Separator className="my-5" />

        <div className="px-5 space-y-4 text-sm">
          <Detail icon={User} label="Owner" value={file.owner.name} />
          <Detail icon={Clock} label="Modified" value={formatRelative(file.modified)} />
          <Detail icon={HardDrive} label="Location" value="My Drive" />
          <Detail icon={Link2} label="Access" value={file.shared?.length ? `${file.shared.length + 1} people` : "Only you"} />
        </div>

        {file.shared && file.shared.length > 0 && (
          <>
            <Separator className="my-5" />
            <div className="px-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Shared with</div>
              <div className="space-y-2.5">
                {[file.owner, ...file.shared].map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {p.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{i === 0 ? "Owner" : "Editor"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          type="button"
          disabled={!onDeleteRequest}
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDeleteRequest?.()}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Delete permanently…
        </Button>
      </div>
    </aside>
  );
}

function Detail({ icon: I, label, value }: { icon: ElementType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <I className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

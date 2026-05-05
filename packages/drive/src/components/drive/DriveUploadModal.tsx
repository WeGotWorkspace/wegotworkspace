import { type ChangeEvent, type DragEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { Button } from "@wgw/ui";
import { formatBytes } from "@/lib/files";
import { driveUploadFiles, type DriveUploadProgress } from "@/lib/driveApi";
import { cn } from "@wgw/ui";

type Phase = "idle" | "uploading" | "success" | "error";

export function DriveUploadModal({
  open,
  cwd,
  onClose,
  onComplete,
}: {
  open: boolean;
  cwd: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const fileInputId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<File[]>([]);
  const [err, setErr] = useState<string | undefined>();
  const [dragOver, setDragOver] = useState(false);
  const [currentName, setCurrentName] = useState<string | undefined>();
  const [overall01, setOverall01] = useState(0);
  const dragDepth = useRef(0);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setQueue([]);
    setErr(undefined);
    setDragOver(false);
    setCurrentName(undefined);
    setOverall01(0);
    dragDepth.current = 0;
  }, [open]);

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClose = useCallback(() => {
    if (phase === "uploading") {
      cancelUpload();
    }
    onClose();
  }, [phase, cancelUpload, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const runUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setQueue(files);
      setErr(undefined);
      setPhase("uploading");
      setOverall01(0);
      setCurrentName(files[0]?.name);
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const totalBytes = files.reduce((s, f) => s + f.size, 0) || 1;

      try {
        await driveUploadFiles(cwd, files, {
          signal: ac.signal,
          onProgress: (p: DriveUploadProgress) => {
            setCurrentName(p.fileName);
            const inFile = p.fileProgress;
            const prevBytes = files.slice(0, p.fileIndex).reduce((s, f) => s + f.size, 0);
            const cur = files[p.fileIndex]?.size ?? 0;
            const sent = prevBytes + cur * inFile;
            setOverall01(Math.min(1, sent / totalBytes));
          },
        });
        setOverall01(1);
        setPhase("success");
        onComplete();
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setPhase("idle");
          setQueue([]);
          setOverall01(0);
          return;
        }
        setPhase("error");
        setErr((e as Error).message || "Upload failed.");
      } finally {
        if (abortRef.current === ac) {
          abortRef.current = null;
        }
      }
    },
    [cwd, onComplete],
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      const picked = list?.length ? Array.from(list) : [];
      e.target.value = "";
      if (picked.length === 0) return;
      void runUpload(picked);
    },
    [runUpload],
  );

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragOver(false);
    }
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setDragOver(false);
      if (phase === "uploading") return;
      const list = e.dataTransfer.files;
      if (!list?.length) return;
      void runUpload(Array.from(list));
    },
    [phase, runUpload],
  );

  if (!open) {
    return null;
  }

  const busy = phase === "uploading";
  const folderLabel = cwd === "/" ? "Drive root" : cwd.replace(/\/$/, "") || "/";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-[0_24px_80px_-20px_rgba(0,0,0,0.35)] overflow-hidden"
        role="dialog"
        aria-labelledby="upload-modal-title"
        aria-busy={busy}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-b from-muted/40 to-transparent">
          <div className="min-w-0">
            <h2 id="upload-modal-title" className="text-lg font-semibold tracking-tight">
              Upload files
            </h2>
            <p className="mt-1 text-xs text-muted-foreground font-mono truncate" title={cwd}>
              Into {folderLabel}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={handleClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/*
            Native file picker: programmatic input.click() is blocked for visually hidden inputs in several browsers.
            htmlFor + label gives a real activation path for "Browse…".
          */}
          <input id={fileInputId} type="file" multiple className="sr-only" onChange={onInputChange} />

          <div
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={cn(
              "relative rounded-xl border-2 border-dashed transition-all duration-200",
              dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/70 bg-muted/25",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm",
                  dragOver && "border-primary/40 bg-primary/10 text-primary",
                )}
              >
                {busy ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{busy ? "Uploading…" : "Drop files here"}</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-[16rem] mx-auto leading-relaxed">
                  {busy ? "You can cancel anytime. Large files are sent in small chunks so proxies do not block them." : "Or choose files from your device. Same storage as WebDAV."}
                </p>
              </div>
              {!busy && (
                <label
                  htmlFor={fileInputId}
                  className={cn(
                    "mt-1 inline-flex h-9 cursor-pointer select-none items-center justify-center rounded-full border border-input",
                    "bg-secondary px-5 text-sm font-medium text-secondary-foreground shadow-sm",
                    "transition-colors hover:bg-secondary/80 active:scale-[0.98] active:bg-secondary/70",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                  )}
                >
                  Browse…
                </label>
              )}
            </div>
          </div>

          {queue.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-muted/20 overflow-hidden">
              <div className="max-h-44 overflow-y-auto divide-y divide-border/60">
                {queue.map((f) => (
                  <div key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium" title={f.name}>
                      {f.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatBytes(f.size) ?? "0 B"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(busy || phase === "success") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>Overall</span>
                <span className="tabular-nums">{Math.round(overall01 * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out",
                    phase === "success" ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${Math.round(overall01 * 100)}%` }}
                />
              </div>
              {currentName && busy ? (
                <p className="text-xs text-muted-foreground truncate" title={currentName}>
                  Current: {currentName}
                </p>
              ) : null}
            </div>
          )}

          {phase === "success" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>All files uploaded.</span>
            </div>
          )}

          {phase === "error" && err && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="min-w-0">{err}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/15">
          {busy ? (
            <Button type="button" variant="outline" size="sm" onClick={cancelUpload}>
              Cancel upload
            </Button>
          ) : phase === "success" ? (
            <Button type="button" size="sm" className="rounded-full px-5" onClick={handleClose}>
              Done
            </Button>
          ) : phase === "error" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPhase("idle");
                  setErr(undefined);
                  setQueue([]);
                  setOverall01(0);
                }}
              >
                Try again
              </Button>
              <Button type="button" size="sm" className="rounded-full px-5" onClick={handleClose}>
                Close
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

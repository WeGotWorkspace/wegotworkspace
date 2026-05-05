import { useEffect, useState } from "react";
import { Button } from "@wgw/ui";
import type { DriveFile } from "@/lib/files";
import { driveDeleteItems } from "@/lib/driveApi";

export function DeleteItemModal({
  file,
  onClose,
  onSuccess,
}: {
  file: DriveFile;
  onClose: () => void;
  onSuccess: (file: DriveFile) => void;
}) {
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const isFolder = file.kind === "folder";

  useEffect(() => {
    setErr(undefined);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    setBusy(true);
    setErr(undefined);
    try {
      await driveDeleteItems([{ path: file.path, type: isFolder ? "dir" : "file" }]);
      onSuccess(file);
    } catch (e) {
      setErr((e as Error).message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-item-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-item-title" className="text-lg font-semibold">
          Delete {isFolder ? "folder" : "file"}?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground break-all">{file.name}</span> will be permanently removed from
          the server. This cannot be undone.
          {isFolder ? " Everything inside this folder will be deleted as well." : null}
        </p>
        {err ? <p className="mt-3 text-sm text-destructive">{err}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void submit()} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

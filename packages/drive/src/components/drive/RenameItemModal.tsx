import { useEffect, useState } from "react";
import { Button } from "@wgw/ui";
import { Input } from "@wgw/ui";
import { drivePost } from "@/lib/driveApi";
import type { DriveFile } from "@/lib/files";

function validateItemName(name: string, previous: string): string | undefined {
  const t = name.trim();
  if (!t) return "Name is required.";
  if (t === previous.trim()) return "Choose a different name.";
  if (t.includes("/") || t.includes("\\")) return "Name cannot contain slashes.";
  if (t === "." || t === "..") return "Invalid name.";
  if (t.includes("\0")) return "Invalid name.";
  return undefined;
}

export function RenameItemModal({
  file,
  cwd,
  onClose,
  onSuccess,
}: {
  file: DriveFile;
  cwd: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [draft, setDraft] = useState(file.name);
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(file.name);
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
    const msg = validateItemName(draft, file.name);
    if (msg) {
      setErr(msg);
      return;
    }
    const to = draft.trim();
    setBusy(true);
    setErr(undefined);
    try {
      await drivePost("/renameitem", { destination: cwd, from: file.name, to });
      onSuccess();
    } catch (e) {
      setErr((e as Error).message || "Rename failed.");
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
        aria-labelledby="rename-item-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rename-item-title" className="text-lg font-semibold">
          Rename
        </h2>
        <p className="mt-1 truncate text-sm text-muted-foreground" title={file.path}>
          {file.kind === "folder" ? "Folder" : "File"} in this directory
        </p>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-4 h-10"
          autoFocus
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
        {err ? <p className="mt-2 text-sm text-destructive">{err}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Renaming…" : "Rename"}
          </Button>
        </div>
      </div>
    </div>
  );
}

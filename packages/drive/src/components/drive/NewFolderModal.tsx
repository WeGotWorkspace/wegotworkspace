import { useEffect, useState } from "react";
import { Button } from "@wgw/ui";
import { Input } from "@wgw/ui";
import { driveCreateFolder } from "@/lib/driveApi";

function validateNewFolderName(name: string): string | undefined {
  const t = name.trim();
  if (!t) return "Name is required.";
  if (t.includes("/") || t.includes("\\")) return "Name cannot contain slashes.";
  if (t === "." || t === "..") return "Invalid name.";
  if (t.includes("\0")) return "Invalid name.";
  return undefined;
}

export function NewFolderModal({
  cwd,
  onClose,
  onSuccess,
}: {
  cwd: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [draft, setDraft] = useState("New folder");
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const msg = validateNewFolderName(draft);
    if (msg) {
      setErr(msg);
      return;
    }
    const name = draft.trim();
    setBusy(true);
    setErr(undefined);
    try {
      await driveCreateFolder(cwd, name);
      onSuccess();
    } catch (e) {
      setErr((e as Error).message || "Could not create folder.");
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
        aria-labelledby="new-folder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-folder-title" className="text-lg font-semibold">
          New folder
        </h2>
        <p className="mt-1 truncate text-sm text-muted-foreground" title={cwd}>
          In {cwd === "/" ? "root" : cwd}
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
            {busy ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Notebook, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@wgw/ui";
import { Button } from "@wgw/ui";
import { Input } from "@wgw/ui";
import { Label } from "@wgw/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: string[];
  onCreate: (name: string) => void;
  mode?: "create" | "rename";
  initialName?: string;
  onRename?: (name: string) => void;
};

export function NewNotebookDialog({
  open,
  onOpenChange,
  existing,
  onCreate,
  mode = "create",
  initialName = "",
  onRename,
}: Props) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(mode === "rename" ? initialName : "");
  }, [open, mode, initialName]);

  const trimmed = name.trim();
  const invalidName =
    trimmed === "." || trimmed === ".." || /[\\/]/.test(trimmed) || trimmed.includes("\0");
  const duplicate =
    !!trimmed &&
    existing.some(
      (n) =>
        n.toLowerCase() === trimmed.toLowerCase() &&
        !(mode === "rename" && n.toLowerCase() === initialName.toLowerCase()),
    );
  const unchanged = mode === "rename" && trimmed === initialName.trim();
  const valid = !!trimmed && !invalidName && !duplicate && !unchanged;

  function submit() {
    if (!valid) return;
    if (mode === "rename") {
      onRename?.(trimmed);
    } else {
      onCreate(trimmed);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px] gap-0 p-0 overflow-hidden"
        style={
          {
            // Neutralize the default slide-from-left/top animation from shadcn dialog.
            // Only fade + zoom remain.
            ["--tw-enter-translate-x" as never]: "0",
            ["--tw-enter-translate-y" as never]: "0",
            ["--tw-exit-translate-x" as never]: "0",
            ["--tw-exit-translate-y" as never]: "0",
          } as React.CSSProperties
        }
      >
        {/* Decorative header band */}
        <div className="relative bg-gradient-to-br from-accent/60 via-accent/30 to-background px-6 pt-6 pb-5 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm shrink-0">
              <Notebook className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="font-display text-2xl leading-tight">
                  {mode === "rename" ? "Rename notebook" : "New notebook"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {mode === "rename"
                    ? "Pick a new name for this notebook. Existing notes move with it."
                    : "A fresh shelf for your notes. Give it a name you'll recognize."}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <Sparkles className="absolute right-5 top-5 h-4 w-4 text-primary/40" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="px-6 py-5 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="notebook-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input
              id="notebook-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Travel, Poems, Q3 planning"
              className="h-10 font-display text-base"
            />
            <p className="text-xs text-muted-foreground min-h-[1rem]">
              {invalidName ? (
                <span className="text-destructive">
                  Notebook names cannot contain "/" or "\".
                </span>
              ) : duplicate ? (
                <span className="text-destructive">A notebook with that name already exists.</span>
              ) : (
                <>Press Enter to {mode === "rename" ? "save" : "create"}.</>
              )}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {mode === "rename" ? "Save name" : "Create notebook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
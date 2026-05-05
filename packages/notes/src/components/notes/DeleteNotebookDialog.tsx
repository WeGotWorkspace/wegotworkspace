import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@wgw/ui";
import { Button } from "@wgw/ui";
import { Label } from "@wgw/ui";
import { RadioGroup, RadioGroupItem } from "@wgw/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wgw/ui";
import type { DeleteNotebookAction } from "@/lib/notes-storage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookName: string;
  noteCount: number;
  otherNotebooks: string[];
  onConfirm: (action: DeleteNotebookAction) => void;
};

export function DeleteNotebookDialog({
  open,
  onOpenChange,
  notebookName,
  noteCount,
  otherNotebooks,
  onConfirm,
}: Props) {
  const [mode, setMode] = useState<"move" | "archive" | "purge">("move");
  const [target, setTarget] = useState<string>("__unassigned__");

  useEffect(() => {
    if (open) {
      setMode("move");
      setTarget("__unassigned__");
    }
  }, [open, notebookName]);

  function submit() {
    if (mode === "archive") {
      onConfirm({ kind: "archive" });
    } else if (mode === "purge") {
      onConfirm({ kind: "purge" });
    } else {
      onConfirm({ kind: "move", target });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] gap-0 p-0 overflow-hidden"
        style={
          {
            ["--tw-enter-translate-x" as never]: "0",
            ["--tw-enter-translate-y" as never]: "0",
            ["--tw-exit-translate-x" as never]: "0",
            ["--tw-exit-translate-y" as never]: "0",
          } as React.CSSProperties
        }
      >
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted text-muted-foreground grid place-items-center shrink-0">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="font-display text-xl leading-tight">
                  Delete "{notebookName}"?
                </DialogTitle>
                <DialogDescription className="text-sm">
                  This notebook holds {noteCount} {noteCount === 1 ? "note" : "notes"}.
                  Choose what happens to {noteCount === 1 ? "it" : "them"}.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <div className="px-6 pb-2 space-y-3">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "move" | "archive" | "purge")}
            className="space-y-2"
          >
            <label
              htmlFor="opt-move"
              className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40 transition-colors has-[[data-state=checked]]:border-foreground/20 has-[[data-state=checked]]:bg-muted/30"
            >
              <RadioGroupItem id="opt-move" value="move" className="mt-1" />
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <div className="text-sm font-medium">Move notes to another notebook</div>
                  <div className="text-xs text-muted-foreground">
                    Keep the notes, just shelve them somewhere else.
                  </div>
                </div>
                <div className={mode === "move" ? "" : "opacity-50 pointer-events-none"}>
                  <Label
                    htmlFor="move-target"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    Destination
                  </Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger id="move-target" className="h-9 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {otherNotebooks.map((nb) => (
                        <SelectItem key={nb} value={nb}>
                          {nb}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </label>

            <label
              htmlFor="opt-archive"
              className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40 transition-colors has-[[data-state=checked]]:border-foreground/20 has-[[data-state=checked]]:bg-muted/30"
            >
              <RadioGroupItem id="opt-archive" value="archive" className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Archive all notes in this notebook</div>
                <div className="text-xs text-muted-foreground">
                  Notes move to the Archive — recoverable, but out of the way.
                </div>
              </div>
            </label>

            <label
              htmlFor="opt-purge"
              className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40 transition-colors has-[[data-state=checked]]:border-destructive/40 has-[[data-state=checked]]:bg-destructive/10"
            >
              <RadioGroupItem id="opt-purge" value="purge" className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-destructive">Delete all notes permanently</div>
                <div className="text-xs text-muted-foreground">
                  This cannot be undone. Notes are fully removed, not archived.
                </div>
              </div>
            </label>
          </RadioGroup>
        </div>

        <DialogFooter className="px-6 py-4 gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={mode === "move" && !target}
          >
            Delete notebook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

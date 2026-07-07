import { useEffect, useState } from "react";
import { Button } from "@/button/src/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { TaskProjectDialogState } from "@/tasks-core/src/use-tasks-project-mutations";

type TaskProjectDialogProps = {
  dialog: TaskProjectDialogState;
  onClose: () => void;
  onCreate: (name: string, color: string | null) => void;
  onUpdate: (listId: string, name: string, color: string | null) => void;
  labels: {
    createTitle: string;
    editTitle: string;
    nameLabel: string;
    colorLabel: string;
    createButton: string;
    saveButton: string;
    cancel: string;
  };
};

export function TaskProjectDialog({
  dialog,
  onClose,
  onCreate,
  onUpdate,
  labels,
}: TaskProjectDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (!dialog) return;
    if (dialog.mode === "edit") {
      setName(dialog.list.name);
      setColor(dialog.list.color ?? "");
      return;
    }
    setName("");
    setColor("");
  }, [dialog]);

  const trimmedName = name.trim();
  const open = dialog !== null;
  const isEdit = dialog?.mode === "edit";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? labels.editTitle : labels.createTitle}</DialogTitle>
          <DialogDescription>{labels.nameLabel}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedName) return;
            const nextColor = color.trim() || null;
            if (dialog?.mode === "edit") {
              onUpdate(dialog.list.id, trimmedName, nextColor);
              return;
            }
            onCreate(trimmedName, nextColor);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="task-project-name">{labels.nameLabel}</Label>
            <Input
              id="task-project-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-project-color">{labels.colorLabel}</Label>
            <Input
              id="task-project-color"
              type="color"
              value={color || "#6366f1"}
              onChange={(event) => setColor(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {labels.cancel}
            </Button>
            <Button type="submit" disabled={!trimmedName}>
              {isEdit ? labels.saveButton : labels.createButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

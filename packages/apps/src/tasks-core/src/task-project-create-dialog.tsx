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

type TaskProjectCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: string | null) => void;
  labels: {
    title: string;
    nameLabel: string;
    colorLabel: string;
    createButton: string;
    cancel: string;
  };
  contentClassName?: string;
};

export function TaskProjectCreateDialog({
  open,
  onClose,
  onConfirm,
  labels,
  contentClassName,
}: TaskProjectCreateDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setColor("");
  }, [open]);

  const trimmedName = name.trim();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.nameLabel}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedName) return;
            onConfirm(trimmedName, color.trim() || null);
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
              {labels.createButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

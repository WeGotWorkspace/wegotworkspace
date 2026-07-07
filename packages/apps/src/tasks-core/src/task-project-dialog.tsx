import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/button/src/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { TaskListDot } from "@/tasks-core/src/tasks-list-dot";
import { DEFAULT_TASK_LIST_COLOR, TASK_LIST_DOT_COLORS } from "@/tasks-core/src/tasks-task-utils";
import type { TaskProjectGroupOption } from "@/tasks-core/src/tasks-types";
import "./task-project-dialog.css";

const PERSONAL_SCOPE_VALUE = "__personal__";

export type TaskProjectDialogState =
  | null
  | { mode: "create" }
  | {
      mode: "edit";
      listId: string;
      name: string;
      color: string | null;
      scope: "personal" | "group";
      groupSlug: string | null;
    };

export type TaskProjectDialogConfirmInput = {
  name: string;
  color: string | null;
  groupSlug?: string | null;
};

type TaskProjectDialogLabels = {
  createTitle: string;
  editTitle: string;
  nameLabel: string;
  colorLabel: string;
  scopeLabel: string;
  scopePersonal: (ownerLabel: string) => string;
  scopePersonalDescription: string;
  scopeGroup: (name: string) => string;
  scopeReadOnlyLabel: string;
  createButton: string;
  saveButton: string;
  cancel: string;
};

type TaskProjectDialogProps = {
  dialog: TaskProjectDialogState;
  groups: TaskProjectGroupOption[];
  personalOwnerLabel: string;
  onClose: () => void;
  onConfirm: (input: TaskProjectDialogConfirmInput) => void;
  labels: TaskProjectDialogLabels;
  contentClassName?: string;
};

function normalizePickerColor(color: string | null | undefined): string {
  const trimmed = color?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_TASK_LIST_COLOR;
}

function scopeLabelForEdit(
  scope: "personal" | "group",
  groupSlug: string | null,
  groups: TaskProjectGroupOption[],
  personalOwnerLabel: string,
  labels: TaskProjectDialogLabels,
): string {
  if (scope !== "group" || !groupSlug) return labels.scopePersonal(personalOwnerLabel);
  const group = groups.find((entry) => entry.slug === groupSlug);
  return labels.scopeGroup(group?.displayName ?? groupSlug);
}

export function TaskProjectDialog({
  dialog,
  groups,
  personalOwnerLabel,
  onClose,
  onConfirm,
  labels,
  contentClassName,
}: TaskProjectDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_TASK_LIST_COLOR);
  const [scopeValue, setScopeValue] = useState(PERSONAL_SCOPE_VALUE);
  const customColorInputRef = useRef<HTMLInputElement>(null);
  const customColorInputId = useId();
  const open = dialog !== null;
  const isCreate = dialog?.mode === "create";

  useEffect(() => {
    if (!dialog) return;
    if (dialog.mode === "create") {
      setName("");
      setColor(DEFAULT_TASK_LIST_COLOR);
      setScopeValue(PERSONAL_SCOPE_VALUE);
      return;
    }
    setName(dialog.name);
    setColor(normalizePickerColor(dialog.color));
    setScopeValue(
      dialog.scope === "group" && dialog.groupSlug ? dialog.groupSlug : PERSONAL_SCOPE_VALUE,
    );
  }, [dialog]);

  const trimmedName = name.trim();
  const selectedColor = normalizePickerColor(color);
  const unchangedEdit =
    dialog?.mode === "edit" &&
    trimmedName === dialog.name.trim() &&
    selectedColor === normalizePickerColor(dialog.color);
  const canSubmit = Boolean(trimmedName) && (isCreate || !unchangedEdit);

  const scopeReadOnly =
    dialog?.mode === "edit"
      ? scopeLabelForEdit(dialog.scope, dialog.groupSlug, groups, personalOwnerLabel, labels)
      : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{isCreate ? labels.createTitle : labels.editTitle}</DialogTitle>
          <DialogDescription>{labels.nameLabel}</DialogDescription>
        </DialogHeader>
        <form
          className="task-project-dialog__form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onConfirm({
              name: trimmedName,
              color: selectedColor,
              ...(isCreate
                ? {
                    groupSlug: scopeValue === PERSONAL_SCOPE_VALUE ? null : scopeValue,
                  }
                : {}),
            });
          }}
        >
          <div className="task-project-dialog__field">
            <Label htmlFor="task-project-name">{labels.nameLabel}</Label>
            <Input
              id="task-project-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="task-project-dialog__field">
            <div className="task-project-dialog__color-header">
              <Label id="task-project-color-label">{labels.colorLabel}</Label>
              <TaskListDot
                className="task-project-dialog__preview-dot"
                list={{ id: trimmedName || "preview", color: selectedColor }}
              />
            </div>
            <div
              className="task-project-dialog__swatches"
              role="radiogroup"
              aria-labelledby="task-project-color-label"
            >
              {TASK_LIST_DOT_COLORS.map((swatch) => {
                const selected = selectedColor.toLowerCase() === swatch.toLowerCase();
                return (
                  <button
                    key={swatch}
                    type="button"
                    className={
                      selected
                        ? "task-project-dialog__swatch task-project-dialog__swatch--selected"
                        : "task-project-dialog__swatch"
                    }
                    style={{ backgroundColor: swatch }}
                    aria-label={swatch}
                    aria-checked={selected}
                    role="radio"
                    onClick={() => setColor(swatch)}
                  />
                );
              })}
              <button
                type="button"
                className="task-project-dialog__swatch task-project-dialog__swatch--custom"
                aria-label="Custom color"
                onClick={() => customColorInputRef.current?.click()}
              >
                <span className="task-project-dialog__custom-marker" aria-hidden />
              </button>
              <input
                ref={customColorInputRef}
                id={customColorInputId}
                type="color"
                className="task-project-dialog__native-color"
                value={selectedColor}
                tabIndex={-1}
                aria-hidden
                onChange={(event) => setColor(event.target.value)}
              />
            </div>
          </div>

          {isCreate ? (
            <div className="task-project-dialog__field">
              <Label htmlFor="task-project-scope">{labels.scopeLabel}</Label>
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger id="task-project-scope" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PERSONAL_SCOPE_VALUE}>
                    {labels.scopePersonal(personalOwnerLabel)}
                  </SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.slug} value={group.slug}>
                      {labels.scopeGroup(group.displayName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="task-project-dialog__scope-hint">
                {scopeValue === PERSONAL_SCOPE_VALUE
                  ? labels.scopePersonalDescription
                  : labels.scopeGroup(
                      groups.find((group) => group.slug === scopeValue)?.displayName ?? scopeValue,
                    )}
              </p>
            </div>
          ) : scopeReadOnly ? (
            <div className="task-project-dialog__field">
              <Label>{labels.scopeReadOnlyLabel}</Label>
              <p className="task-project-dialog__scope-readonly">{scopeReadOnly}</p>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {labels.cancel}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isCreate ? labels.createButton : labels.saveButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

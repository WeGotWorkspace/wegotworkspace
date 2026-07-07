import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/button/src/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import {
  dueDateToApiValue,
  formatComposerDueDateLabel,
  parseDueDateValue,
} from "@/tasks-core/src/tasks-task-utils";

type TasksComposerDuePickerProps = {
  labels: TasksUILabels;
  value: string | null;
  onChange: (due: string | null) => void;
  disabled?: boolean;
  triggerClassName?: string;
};

export function TasksComposerDuePicker({
  labels,
  value,
  onChange,
  disabled,
  triggerClassName,
}: TasksComposerDuePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDueDateValue(value);
  const displayLabel = selectedDate
    ? formatComposerDueDateLabel(selectedDate, labels)
    : labels.noDue;

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("select-trigger", triggerClassName)}
          aria-label={labels.addTaskDue}
          disabled={disabled}
        >
          <span className="tasks-main-view__composer-select-option">
            <CalendarDays className="size-3.5" aria-hidden />
            <span>{displayLabel}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="tasks-main-view__composer-due-popover w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(date ? dueDateToApiValue(date) : null);
            if (date) setOpen(false);
          }}
          initialFocus
        />
        {selectedDate ? (
          <div className="tasks-main-view__composer-due-clear">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              className="tasks-main-view__composer-due-clear-button"
              label={labels.noDue}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

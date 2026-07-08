import { useId, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import "@/ui/input.css";
import { TaskListDot } from "@/tasks-core/src/tasks-list-dot";
import { TASK_LIST_DOT_COLORS } from "@/tasks-core/src/tasks-task-utils";
import "./task-project-color-picker.css";

type TaskProjectColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  colorLabel: string;
  previewListId: string;
};

export function TaskProjectColorPicker({
  value,
  onChange,
  colorLabel,
  previewListId,
}: TaskProjectColorPickerProps) {
  const [open, setOpen] = useState(false);
  const customColorInputRef = useRef<HTMLInputElement>(null);
  const customColorInputId = useId();
  const colorLabelId = useId();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="control-surface task-project-color-picker__trigger"
          aria-label={colorLabel}
          aria-haspopup="dialog"
        >
          <TaskListDot
            className="task-project-color-picker__dot"
            list={{ id: previewListId, color: value }}
          />
          <ChevronsUpDown className="task-project-color-picker__chevron" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="task-project-color-picker__content">
        <div
          className="task-project-color-picker__swatches"
          role="radiogroup"
          aria-labelledby={colorLabelId}
        >
          <span id={colorLabelId} className="sr-only">
            {colorLabel}
          </span>
          {TASK_LIST_DOT_COLORS.map((swatch) => {
            const selected = value.toLowerCase() === swatch.toLowerCase();
            return (
              <button
                key={swatch}
                type="button"
                className={
                  selected
                    ? "task-project-color-picker__swatch task-project-color-picker__swatch--selected"
                    : "task-project-color-picker__swatch"
                }
                style={{ backgroundColor: swatch }}
                aria-label={swatch}
                aria-checked={selected}
                role="radio"
                onClick={() => {
                  onChange(swatch);
                  setOpen(false);
                }}
              />
            );
          })}
          <button
            type="button"
            className="task-project-color-picker__swatch task-project-color-picker__swatch--custom"
            aria-label="Custom color"
            onClick={() => customColorInputRef.current?.click()}
          >
            <span className="task-project-color-picker__custom-marker" aria-hidden />
          </button>
          <input
            ref={customColorInputRef}
            id={customColorInputId}
            type="color"
            className="task-project-color-picker__native-color"
            value={value}
            tabIndex={-1}
            aria-hidden
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

import type { Task } from "@/tasks-core/src/tasks-types";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import {
  absoluteReminderAlert,
  offsetReminderAlert,
  taskAlertsFromList,
  taskAlertsToList,
} from "@/tasks-core/src/tasks-task-utils";

export type RemindPreset = "none" | "at-due" | "30m" | "1h" | "1d" | "custom";

type TasksRemindPickerProps = {
  labels: TasksUILabels;
  alerts: Task["alerts"] | undefined;
  due: string | null | undefined;
  onChange: (alerts: Task["alerts"] | undefined) => void;
};

function detectPreset(alerts: Task["alerts"] | undefined): RemindPreset {
  const alert = taskAlertsToList(alerts)[0];
  if (!alert) return "none";
  const trigger = alert.trigger;
  if (trigger["@type"] === "OffsetTrigger") {
    if (trigger.offset === "PT0S" || trigger.offset === "-PT0S") return "at-due";
    if (trigger.offset === "-PT30M") return "30m";
    if (trigger.offset === "-PT1H") return "1h";
    if (trigger.offset === "-P1D") return "1d";
  }
  if (trigger["@type"] === "AbsoluteTrigger") return "custom";
  return "none";
}

function absoluteValue(alerts: Task["alerts"] | undefined): string {
  const alert = taskAlertsToList(alerts)[0];
  if (alert?.trigger["@type"] === "AbsoluteTrigger") {
    return alert.trigger.when.slice(0, 16);
  }
  return "";
}

export function TasksRemindPicker({ labels, alerts, due, onChange }: TasksRemindPickerProps) {
  const preset = detectPreset(alerts);
  const customValue = absoluteValue(alerts);

  const applyPreset = (next: RemindPreset) => {
    switch (next) {
      case "none":
        onChange(undefined);
        break;
      case "at-due":
        onChange(taskAlertsFromList([offsetReminderAlert("PT0S")]));
        break;
      case "30m":
        onChange(taskAlertsFromList([offsetReminderAlert("-PT30M")]));
        break;
      case "1h":
        onChange(taskAlertsFromList([offsetReminderAlert("-PT1H")]));
        break;
      case "1d":
        onChange(taskAlertsFromList([offsetReminderAlert("-P1D")]));
        break;
      case "custom":
        onChange(taskAlertsFromList([absoluteReminderAlert(due ?? new Date().toISOString())]));
        break;
      default:
        break;
    }
  };

  return (
    <div className="tasks-remind-picker flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="tasks-remind-select">
        {labels.remindMe}
      </label>
      <select
        id="tasks-remind-select"
        className="tasks-remind-picker__select rounded-md border px-3 py-2 text-sm"
        value={preset}
        onChange={(event) => applyPreset(event.target.value as RemindPreset)}
      >
        <option value="none">{labels.remindNone}</option>
        <option value="at-due">{labels.remindAtDue}</option>
        <option value="30m">{labels.remind30Min}</option>
        <option value="1h">{labels.remind1Hour}</option>
        <option value="1d">{labels.remind1Day}</option>
        <option value="custom">{labels.remindCustom}</option>
      </select>
      {preset === "custom" ? (
        <input
          type="datetime-local"
          className="rounded-md border px-3 py-2 text-sm"
          value={customValue}
          onChange={(event) => {
            const when = event.target.value ? new Date(event.target.value).toISOString() : "";
            if (when) onChange(taskAlertsFromList([absoluteReminderAlert(when)]));
          }}
        />
      ) : null}
    </div>
  );
}

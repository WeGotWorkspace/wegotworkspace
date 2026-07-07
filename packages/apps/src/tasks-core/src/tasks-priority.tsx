import { Flag } from "lucide-react";
import type { ReactNode } from "react";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";

/** Task priority values: 0 = none, 1 = high, 5 = medium, 9 = low. */
export const TASK_PRIORITY_NONE = 0 as const;
export const TASK_PRIORITY_HIGH = 1 as const;
export const TASK_PRIORITY_MEDIUM = 5 as const;
export const TASK_PRIORITY_LOW = 9 as const;

export const COMPOSER_PRIORITY_VALUES = [
  TASK_PRIORITY_NONE,
  TASK_PRIORITY_HIGH,
  TASK_PRIORITY_MEDIUM,
  TASK_PRIORITY_LOW,
] as const;

export type TaskPriorityValue = (typeof COMPOSER_PRIORITY_VALUES)[number];

export const PRIORITY_FILTER_SLUGS = ["high", "medium", "low"] as const;
export type PriorityFilterSlug = (typeof PRIORITY_FILTER_SLUGS)[number];

export const TASK_PRIORITY_FLAG_COLORS = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#3b82f6",
  none: "color-mix(in oklab, var(--color-ink) 40%, transparent)",
} as const;

export function isTaskPriorityNone(priority: number | null | undefined): boolean {
  return priority == null || priority === TASK_PRIORITY_NONE;
}

export function priorityFromFilterSlug(slug: string): number | null {
  switch (slug) {
    case "high":
      return TASK_PRIORITY_HIGH;
    case "medium":
      return TASK_PRIORITY_MEDIUM;
    case "low":
      return TASK_PRIORITY_LOW;
    default:
      return null;
  }
}

export function priorityLabel(priority: TaskPriorityValue, L: TasksUILabels): string {
  switch (priority) {
    case TASK_PRIORITY_NONE:
      return L.priorityNone;
    case TASK_PRIORITY_HIGH:
      return L.priorityHigh;
    case TASK_PRIORITY_MEDIUM:
      return L.priorityMedium;
    case TASK_PRIORITY_LOW:
      return L.priorityLow;
  }
}

function priorityFlagStyle(priority: number): React.CSSProperties {
  switch (priority) {
    case TASK_PRIORITY_HIGH:
      return { color: TASK_PRIORITY_FLAG_COLORS.high };
    case TASK_PRIORITY_MEDIUM:
      return { color: TASK_PRIORITY_FLAG_COLORS.medium };
    case TASK_PRIORITY_LOW:
      return { color: TASK_PRIORITY_FLAG_COLORS.low, fill: "#ffffff" };
    default:
      return { color: TASK_PRIORITY_FLAG_COLORS.none };
  }
}

export function priorityIcon(priority: number | null | undefined): ReactNode {
  if (isTaskPriorityNone(priority)) {
    return <Flag className="size-3.5" style={priorityFlagStyle(TASK_PRIORITY_NONE)} aria-hidden />;
  }

  return (
    <Flag
      className="size-3.5"
      style={priorityFlagStyle(priority!)}
      aria-hidden
      fill={priority === TASK_PRIORITY_LOW ? "#ffffff" : "currentColor"}
    />
  );
}

export function priorityFilterIcon(slug: PriorityFilterSlug): ReactNode {
  return priorityIcon(priorityFromFilterSlug(slug));
}

export function priorityFilterLabel(slug: PriorityFilterSlug, L: TasksUILabels): string {
  switch (slug) {
    case "high":
      return L.priorityHigh;
    case "medium":
      return L.priorityMedium;
    case "low":
      return L.priorityLow;
  }
}

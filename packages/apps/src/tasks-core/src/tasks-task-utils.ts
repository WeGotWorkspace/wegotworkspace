import type { Task, TaskAlert } from "@/tasks-core/src/tasks-types";

export const TASK_WORKFLOW_STATUSES = [
  "needs-action",
  "in-process",
  "completed",
  "cancelled",
] as const;

export type TaskWorkflowStatus = (typeof TASK_WORKFLOW_STATUSES)[number];

export function normalizeTag(tag: string): string {
  return tag.trim();
}

export function taskListTitle(task: Task, fallback: string): string {
  const title = task.title?.trim();
  return title || fallback;
}

function parseDueDate(task: Task): Date | null {
  const raw = task.due?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isCompleted(task: Task): boolean {
  return task.workflowStatus === "completed" || task.workflowStatus === "cancelled";
}

export function filterTasksByView(tasks: Task[], view: string): Task[] {
  if (view.startsWith("tag:")) {
    const tag = normalizeTag(view.slice(4));
    return tasks.filter((task) => (task.categories ?? []).some((c) => normalizeTag(c) === tag));
  }

  if (view.startsWith("list:")) {
    const listId = view.slice(5);
    return tasks.filter((task) => task.taskListId === listId);
  }

  if (!view.startsWith("state:")) {
    return tasks;
  }

  const state = view.slice(6);
  if (state === "all") return tasks;

  const today = startOfLocalDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (state === "needs-action") {
    return tasks.filter((task) => task.workflowStatus === "needs-action");
  }

  if (state === "today") {
    return tasks.filter((task) => {
      const due = parseDueDate(task);
      if (!due) return false;
      const dueDay = startOfLocalDay(due);
      return dueDay.getTime() <= today.getTime() && !isCompleted(task);
    });
  }

  if (state === "upcoming") {
    return tasks.filter((task) => {
      const due = parseDueDate(task);
      if (!due || isCompleted(task)) return false;
      return startOfLocalDay(due).getTime() >= tomorrow.getTime();
    });
  }

  if (state === "overdue") {
    return tasks.filter((task) => {
      const due = parseDueDate(task);
      if (!due || isCompleted(task)) return false;
      return startOfLocalDay(due).getTime() < today.getTime();
    });
  }

  return tasks;
}

export function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((task) => {
    const title = task.title?.toLowerCase() ?? "";
    const description = task.description?.toLowerCase() ?? "";
    const tags = (task.categories ?? []).join(" ").toLowerCase();
    return title.includes(q) || description.includes(q) || tags.includes(q);
  });
}

export function collectTaskTags(tasks: Task[]): string[] {
  const tags = new Set<string>();
  for (const task of tasks) {
    for (const tag of task.categories ?? []) {
      const normalized = normalizeTag(tag);
      if (normalized) tags.add(normalized);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function defaultTaskListId(taskLists: { id: string; isDefault?: boolean }[]): string {
  const preferred = taskLists.find((list) => list.isDefault) ?? taskLists[0];
  return preferred?.id ?? "default";
}

export function formatTaskDue(task: Task): string | null {
  const due = parseDueDate(task);
  if (!due) return null;
  return due.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: task.showWithoutTime ? undefined : "numeric",
    minute: task.showWithoutTime ? undefined : "2-digit",
  });
}

export function statusLabel(
  status: string | null | undefined,
  labels: {
    statusNeedsAction: string;
    statusInProcess: string;
    statusCompleted: string;
    statusCancelled: string;
  },
): string {
  switch (status) {
    case "needs-action":
      return labels.statusNeedsAction;
    case "in-process":
      return labels.statusInProcess;
    case "completed":
      return labels.statusCompleted;
    case "cancelled":
      return labels.statusCancelled;
    default:
      return labels.statusNeedsAction;
  }
}

export function taskAlertsToList(alerts: Task["alerts"] | undefined): TaskAlert[] {
  if (!alerts) return [];
  if (Array.isArray(alerts)) return alerts;
  return Object.values(alerts);
}

export function taskAlertsFromList(alerts: TaskAlert[] | null): Task["alerts"] | undefined {
  if (!alerts || alerts.length === 0) return undefined;
  const map: Record<string, TaskAlert> = {};
  alerts.forEach((alert, index) => {
    map[`alert${index + 1}`] = alert;
  });
  return map;
}

export function offsetReminderAlert(offset: string): TaskAlert {
  return {
    "@type": "Alert",
    trigger: {
      "@type": "OffsetTrigger",
      offset,
      relativeTo: "end",
    },
    action: "display",
  };
}

export function absoluteReminderAlert(when: string): TaskAlert {
  return {
    "@type": "Alert",
    trigger: {
      "@type": "AbsoluteTrigger",
      when,
    },
    action: "display",
  };
}

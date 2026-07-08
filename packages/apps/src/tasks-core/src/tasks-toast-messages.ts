import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";

export function tasksCompleteToastMessage(
  completing: boolean,
  labels: Pick<TasksUILabels, "toastTaskCompleted" | "toastTaskReopened">,
): string {
  return completing ? labels.toastTaskCompleted : labels.toastTaskReopened;
}

export function tasksMoveToastMessage(
  count: number,
  listName: string,
  labels: Pick<TasksUILabels, "toastTaskMoved">,
): string {
  return labels.toastTaskMoved(count, listName);
}

import { CheckCircle2, CircleDot, CircleX, Clock } from "lucide-react";
import type { ReactNode } from "react";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import type { TaskWorkflowStatus } from "@/tasks-core/src/tasks-task-utils";

export function workflowStatusLabel(status: TaskWorkflowStatus, L: TasksUILabels): string {
  switch (status) {
    case "needs-action":
      return L.stateNeedsAction;
    case "in-process":
      return L.stateInProcess;
    case "completed":
      return L.stateCompleted;
    case "cancelled":
      return L.stateCancelled;
  }
}

export function workflowStatusIcon(status: TaskWorkflowStatus): ReactNode {
  switch (status) {
    case "needs-action":
      return <Clock className="size-3.5" aria-hidden />;
    case "in-process":
      return <CircleDot className="size-3.5" aria-hidden />;
    case "completed":
      return <CheckCircle2 className="size-3.5" aria-hidden />;
    case "cancelled":
      return <CircleX className="size-3.5" aria-hidden />;
  }
}

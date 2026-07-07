import { Inbox } from "lucide-react";
import {
  INBOX_TASK_LIST_ID,
  isInboxTaskList,
  taskListDotColor,
} from "@/tasks-core/src/tasks-task-utils";
import "@/tasks-core/src/tasks-list-dot.css";

type TaskListDotSource = {
  id: string;
  color?: string | null;
  role?: string | null;
  name?: string;
};

type TaskListDotProps = {
  list: string | TaskListDotSource;
  className?: string;
};

function isInboxListRef(list: string | TaskListDotSource): boolean {
  if (typeof list === "string") return list === INBOX_TASK_LIST_ID;
  return isInboxTaskList(list);
}

export function TaskListDot({ list, className }: TaskListDotProps) {
  if (isInboxListRef(list)) {
    return (
      <Inbox
        className={className ? `tasks-list-inbox-icon ${className}` : "tasks-list-inbox-icon"}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={className ? `tasks-list-dot ${className}` : "tasks-list-dot"}
      style={{ backgroundColor: taskListDotColor(list) }}
      aria-hidden
    />
  );
}

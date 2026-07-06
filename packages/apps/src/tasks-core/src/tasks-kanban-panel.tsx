import { ListItem } from "@/list-item/src/list-item";
import type { Task } from "@/tasks-core/src/tasks-types";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import { statusLabel, taskListTitle } from "@/tasks-core/src/tasks-task-utils";

type TasksKanbanPanelProps = {
  labels: TasksUILabels;
  tasks: Task[];
  onMove: (taskId: string, status: string) => void;
  activeId: string;
  onSelect: (taskId: string) => void;
};

const KANBAN_COLUMNS = ["needs-action", "in-process", "completed", "cancelled"] as const;

export function TasksKanbanPanel({
  labels,
  tasks,
  onMove,
  activeId,
  onSelect,
}: TasksKanbanPanelProps) {
  return (
    <div className="tasks-kanban-panel grid h-full grid-cols-1 gap-4 overflow-auto p-4 md:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLUMNS.map((status) => {
        const columnTasks = tasks.filter(
          (task) => (task.workflowStatus ?? "needs-action") === status,
        );
        return (
          <section
            key={status}
            className="tasks-kanban-panel__column flex min-h-48 flex-col rounded-lg border bg-white/40 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("text/task-id");
              if (taskId) onMove(taskId, status);
            }}
          >
            <h3 className="mb-3 text-sm font-semibold">{statusLabel(status, labels)}</h3>
            <div className="flex flex-1 flex-col gap-2">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/task-id", task.id);
                  }}
                >
                  <ListItem
                    id={task.id}
                    title={taskListTitle(task, labels.untitledTask)}
                    subtitle={statusLabel(task.workflowStatus, labels)}
                    date=""
                    text=""
                    isActive={activeId === task.id}
                    isSelected={false}
                    selectionMode={false}
                    isTouch={false}
                    isDragging={false}
                    onClick={() => onSelect(task.id)}
                    onLongPress={() => onSelect(task.id)}
                    onDragStart={() => undefined}
                    onDragEnd={() => undefined}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

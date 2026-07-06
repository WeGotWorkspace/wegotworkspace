import { Trash2 } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { Tag } from "@/tag/src/tag";
import type { Task, TaskPatch } from "@/tasks-core/src/tasks-types";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import {
  TASK_WORKFLOW_STATUSES,
  statusLabel,
  taskListTitle,
} from "@/tasks-core/src/tasks-task-utils";
import { TasksRemindPicker } from "@/tasks-core/src/tasks-remind-picker";

type TasksDetailViewProps = {
  task: Task;
  labels: TasksUILabels;
  onUpdate: (patch: TaskPatch) => void;
  onDelete: () => void;
  onToggleTag: (tag: string) => void;
  onSetAlerts: (alerts: Task["alerts"] | undefined) => void;
};

export function TasksDetailView({
  task,
  labels,
  onUpdate,
  onDelete,
  onToggleTag,
  onSetAlerts,
}: TasksDetailViewProps) {
  return (
    <div className="tasks-detail-view flex h-full flex-col gap-6 px-6 py-8 md:px-10 md:py-12">
      <div className="flex items-start justify-between gap-4">
        <input
          className="tasks-detail-view__title w-full border-0 bg-transparent text-2xl font-semibold outline-none"
          value={task.title ?? ""}
          placeholder={labels.untitledTask}
          onChange={(event) => onUpdate({ title: event.target.value })}
        />
        <IconButton
          label={labels.delete}
          icon={<Trash2 className="size-4" />}
          variant="subtle"
          onClick={onDelete}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.statusNeedsAction}</span>
          <select
            className="rounded-md border px-3 py-2"
            value={task.workflowStatus ?? "needs-action"}
            onChange={(event) => onUpdate({ workflowStatus: event.target.value })}
          >
            {TASK_WORKFLOW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status, labels)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.dueLabel}</span>
          <input
            type="datetime-local"
            className="rounded-md border px-3 py-2"
            value={task.due ? task.due.slice(0, 16) : ""}
            onChange={(event) =>
              onUpdate({
                due: event.target.value
                  ? new Date(event.target.value).toISOString().slice(0, 19)
                  : null,
              })
            }
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.priorityNormal}</span>
          <select
            className="rounded-md border px-3 py-2"
            value={task.priority ?? 0}
            onChange={(event) => onUpdate({ priority: Number(event.target.value) })}
          >
            <option value={1}>{labels.priorityHigh}</option>
            <option value={5}>{labels.priorityNormal}</option>
            <option value={9}>{labels.priorityLow}</option>
          </select>
        </label>
      </div>

      <TasksRemindPicker
        labels={labels}
        alerts={task.alerts}
        due={task.due}
        onChange={onSetAlerts}
      />

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">{labels.descriptionLabel}</span>
        <textarea
          className="min-h-32 rounded-md border px-3 py-2"
          value={task.description ?? ""}
          onChange={(event) => onUpdate({ description: event.target.value || null })}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{labels.tagsLabel}</span>
        <div className="flex flex-wrap gap-2">
          {(task.categories ?? []).map((tag) => (
            <button key={tag} type="button" onClick={() => onToggleTag(tag)}>
              <Tag label={tag} />
            </button>
          ))}
          <Button
            size="sm"
            variant="subtle"
            onClick={() => {
              const next = window.prompt(labels.addTag);
              if (next?.trim()) onToggleTag(next.trim());
            }}
          >
            {labels.addTag}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TasksDetailEmpty({ labels }: { labels: TasksUILabels }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-sm opacity-70">
      {labels.emptyDetail}
    </div>
  );
}

export function TasksDetailTitle({ task, labels }: { task: Task; labels: TasksUILabels }) {
  return taskListTitle(task, labels.untitledTask);
}

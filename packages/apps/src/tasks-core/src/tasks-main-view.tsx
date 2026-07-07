import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { CheckCircle2, Circle, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { Button } from "@/button/src/button";
import { DropdownMenu } from "@/menu-dropdown/src/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import type { Task, TaskList } from "@/tasks-core/src/tasks-types";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import { TaskListDot } from "@/tasks-core/src/tasks-list-dot";
import {
  isTaskCompleted,
  taskListName,
  taskListTitle,
  type TaskWorkflowStatus,
} from "@/tasks-core/src/tasks-task-utils";
import { workflowStatusIcon, workflowStatusLabel } from "@/tasks-core/src/tasks-workflow-status";
import {
  COMPOSER_PRIORITY_VALUES,
  isTaskPriorityNone,
  priorityIcon,
  priorityLabel,
  TASK_PRIORITY_NONE,
  type TaskPriorityValue,
} from "@/tasks-core/src/tasks-priority";
import { TasksComposerDuePicker } from "@/tasks-core/src/tasks-composer-due-picker";
import "@/tasks-core/src/tasks-main-view.css";

export type TasksCreateInput = {
  title: string;
  description: string;
  listId: string;
  workflowStatus: TaskWorkflowStatus;
  priority: TaskPriorityValue;
  due: string | null;
};

export type TasksMainViewHandle = {
  focusComposerTitle: () => void;
};

type TasksMainViewProps = {
  L: TasksUILabels;
  displayTasks: Task[];
  exitingTaskIds: ReadonlySet<string>;
  taskLists: TaskList[];
  defaultListId: string;
  canCreate: boolean;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (input: TasksCreateInput) => void;
  onTaskExitAnimationEnd: (taskId: string) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  isItemDragging: (id: string) => boolean;
};

const DEFAULT_WORKFLOW_STATUS: TaskWorkflowStatus = "needs-action";

const COMPOSER_WORKFLOW_STATUSES: TaskWorkflowStatus[] = ["needs-action", "in-process"];

const COMPOSER_SELECT_TRIGGER_CLASS = "tasks-main-view__composer-select";
const COMPOSER_SELECT_CONTENT_CLASS = "tasks-main-view__composer-select-content";
const COMPOSER_SELECT_ITEM_CLASS = "tasks-main-view__composer-select-item";

const emptyForm = (listId: string): TasksCreateInput => ({
  title: "",
  description: "",
  listId,
  workflowStatus: DEFAULT_WORKFLOW_STATUS,
  priority: TASK_PRIORITY_NONE,
  due: null,
});

function ComposerSelectOption({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="tasks-main-view__composer-select-option">
      {icon}
      {label}
    </span>
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type TaskRowProps = {
  task: Task;
  L: TasksUILabels;
  taskLists: TaskList[];
  isExiting: boolean;
  isDragging: boolean;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskExitAnimationEnd: (taskId: string) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
};

function TaskRow({
  task,
  L,
  taskLists,
  isExiting,
  isDragging,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onTaskExitAnimationEnd,
  itemDragHandlers,
}: TaskRowProps) {
  const dragHandlers = itemDragHandlers(task.id) as {
    onDragStart?: (event: DragEvent) => void;
    onDragEnd?: () => void;
  };
  const completed = isTaskCompleted(task);
  const listName = taskListName(task.taskListId, taskLists);
  const taskList = taskLists.find((list) => list.id === task.taskListId);
  const workflowStatus = (task.workflowStatus ?? "needs-action") as TaskWorkflowStatus;

  useEffect(() => {
    if (!isExiting || !prefersReducedMotion()) return;
    onTaskExitAnimationEnd(task.id);
  }, [isExiting, onTaskExitAnimationEnd, task.id]);

  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isExiting) return;
      const target = event.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select, [role='menu'], [role='menuitem']")) {
        return;
      }
      onToggleComplete(task.id);
    },
    [isExiting, onToggleComplete, task.id],
  );

  return (
    <div
      role="listitem"
      className={`tasks-main-view__row${isExiting ? " tasks-main-view__row--exiting" : completed ? " tasks-main-view__row--completed" : ""}${isDragging ? " opacity-50" : ""}`}
      draggable={!isExiting}
      onClick={handleRowClick}
      onDragStart={dragHandlers.onDragStart}
      onDragEnd={dragHandlers.onDragEnd}
      onAnimationEnd={(event) => {
        if (!isExiting || event.animationName !== "tasks-row-exit") return;
        onTaskExitAnimationEnd(task.id);
      }}
    >
      <button
        type="button"
        className={`tasks-main-view__complete${completed ? " tasks-main-view__complete--done" : ""}`}
        aria-label={completed ? L.markIncomplete : L.markComplete}
        onClick={() => onToggleComplete(task.id)}
        disabled={isExiting}
      >
        {completed ? <CheckCircle2 aria-hidden /> : <Circle aria-hidden />}
      </button>

      <div className="tasks-main-view__body">
        <p className="tasks-main-view__title">{taskListTitle(task, L.untitledTask)}</p>
        {task.description?.trim() ? (
          <p className="tasks-main-view__description">{task.description}</p>
        ) : null}
        <div className="tasks-main-view__meta">
          <span className="tasks-main-view__meta-item">
            <TaskListDot list={taskList ?? task.taskListId} />
            <span>{listName}</span>
          </span>
          <span className="tasks-main-view__meta-item">
            {workflowStatusIcon(workflowStatus)}
            <span>{workflowStatusLabel(workflowStatus, L)}</span>
          </span>
          {!isTaskPriorityNone(task.priority) ? (
            <span
              className="tasks-main-view__meta-item tasks-main-view__meta-item--priority"
              aria-label={priorityLabel(task.priority as TaskPriorityValue, L)}
            >
              {priorityIcon(task.priority)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="tasks-main-view__actions">
        <DropdownMenu
          align="end"
          trigger={
            <IconButton
              label={L.taskActions}
              icon={<MoreVertical className="size-4" />}
              size="sm"
              variant="subtle"
              disabled={isExiting}
            />
          }
          items={[
            {
              id: "edit",
              label: L.editTask,
              icon: <Pencil className="size-4" />,
              onClick: () => onEditTask(task.id),
            },
            {
              id: "delete",
              label: L.delete,
              icon: <Trash2 className="size-4" />,
              onClick: () => onDeleteTask(task.id),
            },
          ]}
        />
      </div>
    </div>
  );
}

export const TasksMainView = forwardRef<TasksMainViewHandle, TasksMainViewProps>(
  function TasksMainView(
    {
      L,
      displayTasks,
      exitingTaskIds,
      taskLists,
      defaultListId,
      canCreate,
      onToggleComplete,
      onEditTask,
      onDeleteTask,
      onCreateTask,
      onTaskExitAnimationEnd,
      itemDragHandlers,
      isItemDragging,
    },
    ref,
  ) {
    const titleRef = useRef<HTMLInputElement>(null);
    const composerFormRef = useRef<HTMLFormElement>(null);
    const [draft, setDraft] = useState(() => emptyForm(defaultListId));
    const [composerExpanded, setComposerExpanded] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        focusComposerTitle: () => {
          titleRef.current?.focus();
          titleRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        },
      }),
      [],
    );

    const resetDraft = useCallback(() => {
      setDraft(emptyForm(defaultListId));
      setComposerExpanded(false);
    }, [defaultListId]);

    useEffect(() => {
      setDraft((prev) => {
        const hasContent =
          prev.title.trim().length > 0 || prev.description.trim().length > 0 || prev.due !== null;
        if (hasContent) return prev;
        const listStillValid = taskLists.some((list) => list.id === prev.listId);
        if (listStillValid && prev.listId === defaultListId) return prev;
        return emptyForm(defaultListId);
      });
    }, [defaultListId, taskLists]);

    const handleSubmit = useCallback(
      (event: FormEvent) => {
        event.preventDefault();
        if (!draft.title.trim()) return;
        onCreateTask(draft);
        resetDraft();
      },
      [draft, onCreateTask, resetDraft],
    );

    const hasDraftContent =
      draft.title.trim().length > 0 || draft.description.trim().length > 0 || draft.due !== null;

    const showDescription = composerExpanded || draft.description.trim().length > 0;

    return (
      <div className="tasks-main-view">
        <div className="tasks-main-view__scroll">
          <div className="tasks-main-view__list" role="list">
            {displayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                L={L}
                taskLists={taskLists}
                isExiting={exitingTaskIds.has(task.id)}
                isDragging={isItemDragging(task.id)}
                onToggleComplete={onToggleComplete}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onTaskExitAnimationEnd={onTaskExitAnimationEnd}
                itemDragHandlers={itemDragHandlers}
              />
            ))}

            <form
              ref={composerFormRef}
              className="tasks-main-view__composer"
              onSubmit={handleSubmit}
            >
              <span className="tasks-main-view__composer-marker" aria-hidden>
                <Plus />
              </span>

              <div className="tasks-main-view__composer-body">
                <input
                  ref={titleRef}
                  type="text"
                  className="tasks-main-view__composer-title"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  onFocus={() => setComposerExpanded(true)}
                  placeholder={L.addTaskNamePlaceholder}
                  aria-label={L.addTaskName}
                  disabled={!canCreate}
                />

                {showDescription ? (
                  <textarea
                    className="tasks-main-view__composer-description"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.shiftKey) return;
                      event.preventDefault();
                      if (!draft.title.trim()) return;
                      composerFormRef.current?.requestSubmit();
                    }}
                    placeholder={L.addTaskDescriptionPlaceholder}
                    aria-label={L.descriptionLabel}
                    rows={1}
                    disabled={!canCreate}
                  />
                ) : null}

                <div className="tasks-main-view__composer-meta">
                  <TasksComposerDuePicker
                    labels={L}
                    value={draft.due}
                    onChange={(due) => setDraft((prev) => ({ ...prev, due }))}
                    disabled={!canCreate}
                    triggerClassName={COMPOSER_SELECT_TRIGGER_CLASS}
                  />

                  <Select
                    value={draft.listId}
                    onValueChange={(listId) => setDraft((prev) => ({ ...prev, listId }))}
                    disabled={!canCreate}
                  >
                    <SelectTrigger
                      className={COMPOSER_SELECT_TRIGGER_CLASS}
                      aria-label={L.addTaskList}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={COMPOSER_SELECT_CONTENT_CLASS}>
                      {taskLists.map((list) => (
                        <SelectItem
                          key={list.id}
                          value={list.id}
                          className={COMPOSER_SELECT_ITEM_CLASS}
                        >
                          <ComposerSelectOption
                            icon={<TaskListDot list={list} />}
                            label={list.name}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={draft.workflowStatus}
                    onValueChange={(workflowStatus) =>
                      setDraft((prev) => ({
                        ...prev,
                        workflowStatus: workflowStatus as TaskWorkflowStatus,
                      }))
                    }
                    disabled={!canCreate}
                  >
                    <SelectTrigger
                      className={COMPOSER_SELECT_TRIGGER_CLASS}
                      aria-label={L.addTaskStatus}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={COMPOSER_SELECT_CONTENT_CLASS}>
                      {COMPOSER_WORKFLOW_STATUSES.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className={COMPOSER_SELECT_ITEM_CLASS}
                        >
                          <ComposerSelectOption
                            icon={workflowStatusIcon(status)}
                            label={workflowStatusLabel(status, L)}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(draft.priority)}
                    onValueChange={(priority) =>
                      setDraft((prev) => ({
                        ...prev,
                        priority: Number(priority) as TaskPriorityValue,
                      }))
                    }
                    disabled={!canCreate}
                  >
                    <SelectTrigger
                      className={COMPOSER_SELECT_TRIGGER_CLASS}
                      aria-label={L.addTaskPriority}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={COMPOSER_SELECT_CONTENT_CLASS}>
                      {COMPOSER_PRIORITY_VALUES.map((priority) => (
                        <SelectItem
                          key={priority}
                          value={String(priority)}
                          className={COMPOSER_SELECT_ITEM_CLASS}
                        >
                          <ComposerSelectOption
                            icon={priorityIcon(priority)}
                            label={priorityLabel(priority, L)}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="tasks-main-view__composer-actions">
                  {hasDraftContent ? (
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      onClick={resetDraft}
                      disabled={!canCreate}
                    >
                      {L.cancel}
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="tasks-main-view__add-submit"
                    disabled={!canCreate || !draft.title.trim()}
                  >
                    {L.addTaskButton}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  },
);

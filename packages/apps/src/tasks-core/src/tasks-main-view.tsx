import { useCallback, useState, type DragEvent, type FormEvent } from "react";
import { CheckCircle2, Circle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { Button } from "@/button/src/button";
import { CollectionSearchInput } from "@/collection-search-input/src/collection-search-input";
import { DropdownMenu } from "@/menu-dropdown/src/dropdown-menu";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { FieldLabelRow } from "@/ui/field-label-row";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import type { Task, TaskList } from "@/tasks-core/src/tasks-types";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import {
  isTaskCompleted,
  taskListDotColor,
  taskListName,
  taskListTitle,
} from "@/tasks-core/src/tasks-task-utils";
import "@/tasks-core/src/tasks-main-view.css";

export type TasksCreateInput = {
  title: string;
  description: string;
  listId: string;
  tag: string;
};

type TasksMainViewProps = {
  L: TasksUILabels;
  listLoading: boolean;
  visibleTasks: Task[];
  taskLists: TaskList[];
  defaultListId: string;
  searchQuery: string;
  onSearchInput: (value: string) => void;
  canCreate: boolean;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (input: TasksCreateInput) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  isItemDragging: (id: string) => boolean;
};

const emptyForm = (listId: string): TasksCreateInput => ({
  title: "",
  description: "",
  listId,
  tag: "",
});

export function TasksMainView({
  L,
  listLoading,
  visibleTasks,
  taskLists,
  defaultListId,
  searchQuery,
  onSearchInput,
  canCreate,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onCreateTask,
  itemDragHandlers,
  isItemDragging,
}: TasksMainViewProps) {
  const [draft, setDraft] = useState(() => emptyForm(defaultListId));

  const resetDraft = useCallback(() => {
    setDraft(emptyForm(defaultListId));
  }, [defaultListId]);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (!draft.title.trim()) return;
      onCreateTask(draft);
      resetDraft();
    },
    [draft, onCreateTask, resetDraft],
  );

  return (
    <div className="tasks-main-view">
      <div className="tasks-main-view__mobile-search sm:hidden">
        <CollectionSearchInput
          value={searchQuery}
          onChange={onSearchInput}
          placeholder={L.searchPlaceholder}
          aria-label={L.searchPlaceholder}
        />
      </div>

      <div className="tasks-main-view__scroll">
        {listLoading ? (
          <div className="tasks-main-view__loading" aria-busy>
            <LoadingSpinner size="lg" label={L.refreshList} />
          </div>
        ) : visibleTasks.length === 0 ? (
          <p className="tasks-main-view__empty">{L.emptyList}</p>
        ) : (
          <ul className="tasks-main-view__list">
            {visibleTasks.map((task) => {
              const dragHandlers = itemDragHandlers(task.id) as {
                onDragStart?: (event: DragEvent) => void;
                onDragEnd?: () => void;
              };
              const completed = isTaskCompleted(task);
              const listName = taskListName(task.taskListId, taskLists);
              const dotColor = taskListDotColor(task.taskListId);

              return (
                <li
                  key={task.id}
                  className={`tasks-main-view__row${completed ? " tasks-main-view__row--completed" : ""}${isItemDragging(task.id) ? " opacity-50" : ""}`}
                  draggable
                  onDragStart={dragHandlers.onDragStart}
                  onDragEnd={dragHandlers.onDragEnd}
                >
                  <button
                    type="button"
                    className={`tasks-main-view__complete${completed ? " tasks-main-view__complete--done" : ""}`}
                    aria-label={completed ? L.markIncomplete : L.markComplete}
                    onClick={() => onToggleComplete(task.id)}
                  >
                    {completed ? (
                      <CheckCircle2 className="size-5" aria-hidden />
                    ) : (
                      <Circle className="size-5" aria-hidden />
                    )}
                  </button>

                  <div className="tasks-main-view__body">
                    <p className="tasks-main-view__title">{taskListTitle(task, L.untitledTask)}</p>
                    {task.description?.trim() ? (
                      <p className="tasks-main-view__description">{task.description}</p>
                    ) : null}
                    <div className="tasks-main-view__meta">
                      <span
                        className="tasks-main-view__list-dot"
                        style={{ backgroundColor: dotColor }}
                        aria-hidden
                      />
                      <span>{listName}</span>
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
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form className="tasks-main-view__add" onSubmit={handleSubmit}>
        <div className="tasks-main-view__add-fields">
          <FieldLabelRow label={L.addTaskName} htmlFor="tasks-add-title">
            <Input
              id="tasks-add-title"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={L.addTaskNamePlaceholder}
              disabled={!canCreate}
            />
          </FieldLabelRow>

          <FieldLabelRow label={L.descriptionLabel} htmlFor="tasks-add-description">
            <Textarea
              id="tasks-add-description"
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder={L.addTaskDescriptionPlaceholder}
              rows={2}
              disabled={!canCreate}
            />
          </FieldLabelRow>

          <div className="tasks-main-view__add-row">
            <FieldLabelRow label={L.addTaskList} htmlFor="tasks-add-list">
              <Select
                value={draft.listId}
                onValueChange={(listId) => setDraft((prev) => ({ ...prev, listId }))}
                disabled={!canCreate}
              >
                <SelectTrigger id="tasks-add-list" className="tasks-main-view__list-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <span className="tasks-main-view__list-select-trigger">
                        <span
                          className="tasks-main-view__list-dot"
                          style={{ backgroundColor: taskListDotColor(list.id) }}
                          aria-hidden
                        />
                        {list.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldLabelRow>

            <FieldLabelRow label={L.addTaskTag} htmlFor="tasks-add-tag">
              <Input
                id="tasks-add-tag"
                value={draft.tag}
                onChange={(event) => setDraft((prev) => ({ ...prev, tag: event.target.value }))}
                placeholder={L.addTaskTagPlaceholder}
                disabled={!canCreate}
              />
            </FieldLabelRow>
          </div>
        </div>

        <div className="tasks-main-view__add-actions">
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={resetDraft}
            disabled={!canCreate}
          >
            {L.cancel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!canCreate || !draft.title.trim()}
          >
            {L.addTaskButton}
          </Button>
        </div>
      </form>
    </div>
  );
}

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { CheckCircle2, Circle, MoreVertical, Pencil, Tag, Trash2 } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { Button } from "@/button/src/button";
import { CollectionSearchInput } from "@/collection-search-input/src/collection-search-input";
import { DropdownMenu } from "@/menu-dropdown/src/dropdown-menu";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
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

export type TasksMainViewHandle = {
  focusComposerTitle: () => void;
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

export const TasksMainView = forwardRef<TasksMainViewHandle, TasksMainViewProps>(
  function TasksMainView(
    {
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
    },
    ref,
  ) {
    const titleRef = useRef<HTMLInputElement>(null);
    const [draft, setDraft] = useState(() => emptyForm(defaultListId));
    const [titleFocused, setTitleFocused] = useState(false);

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
      setTitleFocused(false);
    }, [defaultListId]);

    useEffect(() => {
      setDraft((prev) => {
        const hasContent =
          prev.title.trim().length > 0 ||
          prev.description.trim().length > 0 ||
          prev.tag.trim().length > 0;
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
      draft.title.trim().length > 0 ||
      draft.description.trim().length > 0 ||
      draft.tag.trim().length > 0;

    const showDescription = titleFocused || draft.description.trim().length > 0;

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
          ) : (
            <>
              {visibleTasks.length === 0 ? (
                <p className="tasks-main-view__empty">{L.emptyList}</p>
              ) : null}

              <div className="tasks-main-view__list" role="list">
                {visibleTasks.map((task) => {
                  const dragHandlers = itemDragHandlers(task.id) as {
                    onDragStart?: (event: DragEvent) => void;
                    onDragEnd?: () => void;
                  };
                  const completed = isTaskCompleted(task);
                  const listName = taskListName(task.taskListId, taskLists);
                  const taskList = taskLists.find((list) => list.id === task.taskListId);
                  const dotColor = taskListDotColor(taskList ?? task.taskListId);

                  return (
                    <div
                      key={task.id}
                      role="listitem"
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
                        {completed ? <CheckCircle2 aria-hidden /> : <Circle aria-hidden />}
                      </button>

                      <div className="tasks-main-view__body">
                        <p className="tasks-main-view__title">
                          {taskListTitle(task, L.untitledTask)}
                        </p>
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
                    </div>
                  );
                })}

                <form className="tasks-main-view__composer" onSubmit={handleSubmit}>
                  <span className="tasks-main-view__composer-marker" aria-hidden>
                    <Circle />
                  </span>

                  <div className="tasks-main-view__composer-body">
                    <input
                      ref={titleRef}
                      type="text"
                      className="tasks-main-view__composer-title"
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, title: event.target.value }))
                      }
                      onFocus={() => setTitleFocused(true)}
                      onBlur={() => setTitleFocused(false)}
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
                        placeholder={L.addTaskDescriptionPlaceholder}
                        aria-label={L.descriptionLabel}
                        rows={1}
                        disabled={!canCreate}
                      />
                    ) : null}

                    <div className="tasks-main-view__composer-meta">
                      <Select
                        value={draft.listId}
                        onValueChange={(listId) => setDraft((prev) => ({ ...prev, listId }))}
                        disabled={!canCreate}
                      >
                        <SelectTrigger
                          className="tasks-main-view__composer-list-select"
                          aria-label={L.addTaskList}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taskLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              <span className="tasks-main-view__list-select-option">
                                <span
                                  className="tasks-main-view__list-dot"
                                  style={{ backgroundColor: taskListDotColor(list) }}
                                  aria-hidden
                                />
                                {list.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="tasks-main-view__composer-tag">
                        <Tag className="tasks-main-view__composer-tag-icon" aria-hidden />
                        <input
                          type="text"
                          className="tasks-main-view__composer-tag-input"
                          value={draft.tag}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, tag: event.target.value }))
                          }
                          placeholder={L.addTaskTagPlaceholder}
                          aria-label={L.addTaskTag}
                          disabled={!canCreate}
                        />
                      </div>
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
                        disabled={!canCreate || !draft.title.trim()}
                      >
                        {L.addTaskButton}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    );
  },
);

import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { LayoutGrid, List, RefreshCw } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { ListItem } from "@/list-item/src/list-item";
import { ViewHeader } from "@/view-header/src/view-header";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { WorkspaceSwipeList } from "@/workspace-swipe-list/src/workspace-swipe-list";
import { cn } from "@/lib/utils";
import type { Task } from "@/tasks-core/src/tasks-types";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import { formatTaskDue, statusLabel, taskListTitle } from "@/tasks-core/src/tasks-task-utils";
import "@/tasks-core/src/tasks-list-panel.css";

type TasksListPanelProps = {
  L: TasksUILabels;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  viewLabel: string;
  selectedIds: string[];
  selectionMode: boolean;
  listLoading: boolean;
  visibleTasks: Task[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  activeId: string;
  isTouch: boolean;
  isItemDragging: (id: string) => boolean;
  handleSelect: (id: string, e: ReactMouseEvent) => void;
  enterSelectionFor: (id: string) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  selectionBar: ReactNode;
  showKanbanToggle: boolean;
  kanbanMode: boolean;
  onKanbanModeChange: (next: boolean) => void;
  onRefreshList?: () => void;
};

export function TasksListPanel({
  L,
  sidebarOpen,
  onToggleSidebar,
  viewLabel,
  selectedIds,
  selectionMode,
  listLoading,
  visibleTasks,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  activeId,
  isTouch,
  isItemDragging,
  handleSelect,
  enterSelectionFor,
  itemDragHandlers,
  selectionBar,
  showKanbanToggle,
  kanbanMode,
  onKanbanModeChange,
  onRefreshList,
}: TasksListPanelProps) {
  return {
    header: (
      <ViewHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        title={viewLabel}
        subtitle={
          selectionMode || selectedIds.length > 1
            ? L.listSelected(selectedIds.length)
            : L.listTasks(visibleTasks.length)
        }
        actions={
          <div className="tasks-list-panel__header-actions flex items-center gap-2">
            {onRefreshList ? (
              <IconButton
                label={L.refreshList}
                onClick={onRefreshList}
                disabled={listLoading}
                icon={
                  <RefreshCw className={cn("size-4", listLoading && "animate-spin")} aria-hidden />
                }
                size="sm"
                variant="subtle"
              />
            ) : null}
            {showKanbanToggle ? (
              <IconButton
                label={kanbanMode ? L.listView : L.kanbanToggle}
                onClick={() => onKanbanModeChange(!kanbanMode)}
                icon={kanbanMode ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
                size="sm"
                variant="subtle"
              />
            ) : null}
          </div>
        }
        searchPlaceholder={L.searchPlaceholder}
        searchValue={searchQuery}
        onSearchInput={setSearchQuery}
        searchInputRef={searchInputRef}
      />
    ),
    listContent: listLoading ? (
      <div className="tasks-list-panel__loading" aria-busy>
        <LoadingSpinner size="lg" label={L.refreshList} />
      </div>
    ) : (
      <WorkspaceSwipeList isTouch={isTouch}>
        {visibleTasks.map((task) => {
          const dragHandlers = itemDragHandlers(task.id) as {
            onDragStart?: () => void;
            onDragEnd?: () => void;
          };
          const due = formatTaskDue(task);
          const meta = [
            statusLabel(task.workflowStatus, L),
            due,
            ...(task.categories ?? []).slice(0, 2),
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <ListItem
              key={task.id}
              id={task.id}
              title={taskListTitle(task, L.untitledTask)}
              subtitle={meta}
              date={due ?? ""}
              text={task.description ?? ""}
              isActive={task.id === activeId}
              isSelected={selectedIds.includes(task.id)}
              selectionMode={selectionMode}
              isTouch={isTouch}
              isDragging={isItemDragging(task.id)}
              onClick={(e: ReactMouseEvent) => handleSelect(task.id, e)}
              onLongPress={() => enterSelectionFor(task.id)}
              onDragStart={dragHandlers.onDragStart ?? (() => {})}
              onDragEnd={dragHandlers.onDragEnd ?? (() => {})}
            />
          );
        })}
      </WorkspaceSwipeList>
    ),
    hasItems: listLoading || visibleTasks.length > 0,
    emptyLabel: L.emptyList,
    floatingActionBar: selectionBar,
  };
}

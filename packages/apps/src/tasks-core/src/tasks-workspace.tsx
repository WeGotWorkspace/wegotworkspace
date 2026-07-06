import { Plus } from "lucide-react";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { Button } from "@/button/src/button";
import { MultiSelectionView } from "@/multi-selection-view/src/multi-selection-view";
import { WorkspaceApp } from "@/workspace-app/src/workspace-app";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/document-title";
import type { TasksWorkspaceProps } from "@/tasks-core/src/tasks-workspace-props";
import { TasksDetailEmpty, TasksDetailView } from "@/tasks-core/src/tasks-detail-view";
import { TasksKanbanPanel } from "@/tasks-core/src/tasks-kanban-panel";
import { TasksListPanel } from "@/tasks-core/src/tasks-list-panel";
import { useTasksController } from "@/tasks-core/src/use-tasks-controller";
import { useTasksSidebarModel } from "@/tasks-core/src/use-tasks-sidebar-model";
import { taskListTitle } from "@/tasks-core/src/tasks-task-utils";
import "@/tasks-core/src/tasks-workspace.css";

export function TasksWorkspace({
  data,
  session,
  labels,
  operations,
  listLoading = false,
  bootstrapRevision = 0,
  onRefreshList,
  onLogout,
  className,
  initialView,
  initialTaskId,
  onViewChange,
  onTaskChange,
}: TasksWorkspaceProps) {
  const closeSidebarOnMobile = (closeSidebar: () => void) => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    closeSidebar();
  };

  const controller = useTasksController({
    data,
    labels,
    listLoading,
    operations,
    bootstrapRevision,
    initialView,
    initialTaskId,
    onViewChange,
    onTaskChange,
  });

  const {
    L,
    active,
    activeId,
    view,
    viewLabel,
    visibleTasks,
    selectedIds,
    selectionMode,
    canCreateTask,
    showKanbanToggle,
    kanbanMode,
    setKanbanMode,
    searchQuery,
    searchInputRef,
    workspaceLayoutRef,
    isTouch,
    confirmDialog,
    tags,
    taskLists,
    handleSelect,
    enterSelectionFor,
    selectView,
    setSearchQuery,
    createTask,
    updateActiveTask,
    moveToList,
    assignTagToTasks,
    toggleTaskTag,
    setAlerts,
    openDeleteConfirm,
    selectionBar,
    selectionBarButtons,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    dragToKanbanColumn,
  } = controller;

  const { stateSidebarItems, tagSidebarItems, listSidebarItems } = useTasksSidebarModel({
    labels: L,
    view,
    tags,
    taskLists,
    selectView,
    sidebarDropZoneProps,
    moveToList,
    assignTagToTasks,
  });

  const browserTitleContext =
    active && selectedIds.length <= 1 ? taskListTitle(active, L.untitledTask) : viewLabel;
  useDocumentTitle(browserTitleContext);

  return (
    <>
      <WorkspaceApp
        ref={workspaceLayoutRef}
        workspaceRoot={{
          className: cn("tasks-workspace", className),
        }}
        sidebar={(c) => (
          <AppSidebar
            open={c.sidebarOpen}
            onCloseMobile={c.closeSidebar}
            footer={
              <WorkspaceUserFooter
                name={session.user.displayName}
                initials={workspaceUserInitials(session.user)}
                detailLine={session.user.username}
                onLogoutClick={onLogout}
              />
            }
            primaryButton={
              <Button
                disabled={!canCreateTask}
                onClick={() => {
                  void createTask();
                  closeSidebarOnMobile(c.closeSidebar);
                }}
                icon={<Plus className="size-4" />}
                size="lg"
                pill
                variant="primary"
                className="w-full"
              >
                {L.newTask}
              </Button>
            }
          >
            <SidebarSection title={L.sidebarStates} items={stateSidebarItems} />
            {tagSidebarItems.length > 0 ? (
              <SidebarSection title={L.sidebarTags} items={tagSidebarItems} />
            ) : null}
            <SidebarSection title={L.sidebarLists} items={listSidebarItems} />
          </AppSidebar>
        )}
        list={(c) => {
          if (kanbanMode && showKanbanToggle) {
            const panel = TasksListPanel({
              L,
              sidebarOpen: c.sidebarOpen,
              onToggleSidebar: c.toggleSidebar,
              viewLabel,
              selectedIds,
              selectionMode: selectionMode || selectedIds.length > 1,
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
              onKanbanModeChange: setKanbanMode,
              onRefreshList,
            });
            return {
              ...panel,
              listContent: (
                <TasksKanbanPanel
                  labels={L}
                  tasks={visibleTasks}
                  activeId={activeId}
                  onSelect={(taskId) =>
                    handleSelect(taskId, {
                      metaKey: false,
                      ctrlKey: false,
                      shiftKey: false,
                    } as React.MouseEvent)
                  }
                  onMove={dragToKanbanColumn}
                />
              ),
              hasItems: visibleTasks.length > 0,
            };
          }
          return TasksListPanel({
            L,
            sidebarOpen: c.sidebarOpen,
            onToggleSidebar: c.toggleSidebar,
            viewLabel,
            selectedIds,
            selectionMode: selectionMode || selectedIds.length > 1,
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
            onKanbanModeChange: setKanbanMode,
            onRefreshList,
          });
        }}
        detail={() => {
          if (selectedIds.length > 1) {
            return (
              <MultiSelectionView
                count={selectedIds.length}
                label="Multiple selection"
                title={(count) => `${count} ${count === 1 ? "task" : "tasks"} selected`}
                actions={selectionBarButtons}
              />
            );
          }
          if (!active) {
            return <TasksDetailEmpty labels={L} />;
          }
          return (
            <TasksDetailView
              task={active}
              labels={L}
              onUpdate={updateActiveTask}
              onDelete={openDeleteConfirm}
              onToggleTag={toggleTaskTag}
              onSetAlerts={setAlerts}
            />
          );
        }}
      />
      {confirmDialog}
    </>
  );
}

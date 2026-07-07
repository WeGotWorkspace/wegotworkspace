import { useRef } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { TooltipProvider } from "@/ui/tooltip";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { ViewHeader } from "@/view-header/src/view-header";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/document-title";
import type { TasksWorkspaceProps } from "@/tasks-core/src/tasks-workspace-props";
import { TasksMainView, type TasksMainViewHandle } from "@/tasks-core/src/tasks-main-view";
import { useTasksController } from "@/tasks-core/src/use-tasks-controller";
import { useTasksSidebarModel } from "@/tasks-core/src/use-tasks-sidebar-model";
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
  onViewChange,
}: TasksWorkspaceProps) {
  const composerRef = useRef<TasksMainViewHandle>(null);

  const controller = useTasksController({
    data,
    labels,
    listLoading,
    operations,
    bootstrapRevision,
    initialView,
    onViewChange,
  });

  const {
    L,
    view,
    viewLabel,
    visibleTasks,
    canCreateTask,
    searchQuery,
    sidebarOpen,
    setSidebarOpen,
    confirmDialog,
    tags,
    taskLists,
    selectView,
    setSearchQuery,
    createTaskFromForm,
    toggleTaskComplete,
    editTask,
    requestDeleteTask,
    moveToList,
    assignTagToTasks,
    createListId,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
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

  useDocumentTitle(viewLabel);

  return (
    <TooltipProvider delayDuration={300}>
      <WorkspaceAppLayout
        className={cn("tasks-workspace", className)}
        sidebar={
          <AppSidebar
            open={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            primaryButton={
              <Button
                label={L.newTask}
                icon={<Plus />}
                onClick={() => {
                  composerRef.current?.focusComposerTitle();
                  setSidebarOpen(false);
                }}
                size="lg"
                pill
                variant="primary"
                disabled={!canCreateTask}
                className="w-full"
              />
            }
            footer={
              <WorkspaceUserFooter
                name={session.user.displayName}
                initials={workspaceUserInitials(session.user)}
                detailLine={session.user.username}
                onLogoutClick={onLogout}
              />
            }
          >
            <SidebarSection title={L.sidebarStates} items={stateSidebarItems} />
            {tagSidebarItems.length > 0 ? (
              <SidebarSection title={L.sidebarTags} items={tagSidebarItems} />
            ) : null}
            <SidebarSection title={L.sidebarLists} items={listSidebarItems} />
          </AppSidebar>
        }
        mainHeader={
          <ViewHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            title={viewLabel}
            subtitle={L.listTasks(visibleTasks.length)}
            searchPlaceholder={L.searchPlaceholder}
            searchValue={searchQuery}
            onSearchInput={setSearchQuery}
            actions={
              onRefreshList ? (
                <IconButton
                  label={L.refreshList}
                  onClick={onRefreshList}
                  disabled={listLoading}
                  icon={
                    <RefreshCw
                      className={cn("size-4", listLoading && "animate-spin")}
                      aria-hidden
                    />
                  }
                  size="sm"
                  variant="subtle"
                />
              ) : null
            }
          />
        }
        main={
          <TasksMainView
            ref={composerRef}
            L={L}
            listLoading={listLoading}
            visibleTasks={visibleTasks}
            taskLists={taskLists}
            defaultListId={createListId}
            searchQuery={searchQuery}
            onSearchInput={setSearchQuery}
            canCreate={canCreateTask}
            onToggleComplete={toggleTaskComplete}
            onEditTask={editTask}
            onDeleteTask={requestDeleteTask}
            onCreateTask={(input) => {
              void createTaskFromForm(input);
            }}
            itemDragHandlers={itemDragHandlers}
            isItemDragging={isItemDragging}
          />
        }
      />
      {confirmDialog}
    </TooltipProvider>
  );
}

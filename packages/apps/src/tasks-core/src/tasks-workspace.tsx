import { useRef } from "react";
import { CheckCircle2, Plus, RefreshCw } from "lucide-react";
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
  listRefreshing = false,
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
    operations,
    bootstrapRevision,
    initialView,
    onViewChange,
  });

  const {
    L,
    view,
    viewLabel,
    displayTasks,
    canCreateTask,
    sidebarOpen,
    setSidebarOpen,
    confirmDialog,
    tags,
    taskLists,
    selectView,
    createTaskFromForm,
    toggleTaskComplete,
    editTask,
    requestDeleteTask,
    moveToList,
    assignTagToTasks,
    createListId,
    showCompletedTasks,
    showCompletedToggle,
    toggleShowCompletedTasks,
    exitingTaskIds,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    handleTaskExitAnimationEnd,
  } = controller;

  const {
    inboxSidebarItems,
    timeSidebarItems,
    statusSidebarItems,
    tagSidebarItems,
    projectSidebarItems,
  } = useTasksSidebarModel({
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
            <SidebarSection items={inboxSidebarItems} />
            <SidebarSection title={L.sidebarTime} items={timeSidebarItems} />
            <SidebarSection title={L.sidebarStatus} items={statusSidebarItems} />
            {tagSidebarItems.length > 0 ? (
              <SidebarSection title={L.sidebarTags} items={tagSidebarItems} />
            ) : null}
            {projectSidebarItems.length > 0 ? (
              <SidebarSection title={L.sidebarProjects} items={projectSidebarItems} />
            ) : null}
          </AppSidebar>
        }
        mainHeader={
          <ViewHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            title={viewLabel}
            subtitle={L.listTasks(displayTasks.length)}
            actions={
              <div className="tasks-workspace__header-actions flex items-center gap-2">
                {showCompletedToggle ? (
                  <IconButton
                    label={showCompletedTasks ? L.hideCompletedTasks : L.showCompletedTasks}
                    onClick={toggleShowCompletedTasks}
                    icon={<CheckCircle2 className="size-4" aria-hidden />}
                    size="sm"
                    variant="subtle"
                    active={showCompletedTasks}
                  />
                ) : null}
                {onRefreshList ? (
                  <IconButton
                    label={L.refreshList}
                    onClick={onRefreshList}
                    disabled={listRefreshing}
                    icon={
                      <RefreshCw
                        className={cn("size-4", listRefreshing && "animate-spin")}
                        aria-hidden
                      />
                    }
                    size="sm"
                    variant="subtle"
                  />
                ) : null}
              </div>
            }
          />
        }
        main={
          <TasksMainView
            ref={composerRef}
            L={L}
            displayTasks={displayTasks}
            exitingTaskIds={exitingTaskIds}
            taskLists={taskLists}
            defaultListId={createListId}
            canCreate={canCreateTask}
            onToggleComplete={toggleTaskComplete}
            onEditTask={editTask}
            onDeleteTask={requestDeleteTask}
            onTaskExitAnimationEnd={handleTaskExitAnimationEnd}
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

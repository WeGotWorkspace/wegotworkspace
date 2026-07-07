import { useRef } from "react";
import { CheckCircle2, Pencil, Plus, RefreshCw } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { TooltipProvider } from "@/ui/tooltip";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { ViewHeader } from "@/view-header/src/view-header";
import { EditDialog } from "@/dialogs/src/dialogs";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/document-title";
import type { TasksWorkspaceProps } from "@/tasks-core/src/tasks-workspace-props";
import { TasksMainView, type TasksMainViewHandle } from "@/tasks-core/src/tasks-main-view";
import { TaskProjectCreateDialog } from "@/tasks-core/src/task-project-create-dialog";
import { useTasksController } from "@/tasks-core/src/use-tasks-controller";
import { useTasksSidebarModel } from "@/tasks-core/src/use-tasks-sidebar-model";
import { TasksEditDialog } from "@/tasks-core/src/tasks-edit-dialog";
import "./tasks-workspace.css";
import "./tasks-main-view.css";

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
    editDialog,
    editingTask,
    closeEditTask,
    saveEditedTask,
    taskLists,
    selectView,
    createTaskFromForm,
    toggleTaskComplete,
    editTask,
    requestDeleteTask,
    moveToList,
    createListId,
    showCompletedTasks,
    showCompletedToggle,
    toggleShowCompletedTasks,
    exitingTaskIds,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    handleTaskExitAnimationEnd,
    canManageProjects,
    canRenameProject,
    selectedList,
    createProjectDialog,
    setCreateProjectDialog,
    projectRenameDialog,
    setProjectRenameDialog,
    createProject,
    renameProject,
  } = controller;

  const { topSidebarItems, statusSidebarItems, prioritySidebarItems, projectSidebarItems } =
    useTasksSidebarModel({
      labels: L,
      view,
      taskLists,
      selectView,
      sidebarDropZoneProps,
      moveToList,
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
            <SidebarSection items={topSidebarItems} />
            {canManageProjects || projectSidebarItems.length > 0 ? (
              <SidebarSection
                title={L.sidebarProjects}
                items={projectSidebarItems}
                onAdd={canManageProjects ? () => setCreateProjectDialog(true) : undefined}
                addLabel={L.newProject}
              />
            ) : null}
            <SidebarSection title={L.sidebarStatus} items={statusSidebarItems} />
            <SidebarSection title={L.sidebarPriority} items={prioritySidebarItems} />
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
                {canRenameProject && selectedList ? (
                  <IconButton
                    label={L.renameProject}
                    onClick={() =>
                      setProjectRenameDialog({ listId: selectedList.id, name: selectedList.name })
                    }
                    icon={<Pencil className="size-4" aria-hidden />}
                    variant="subtle"
                  />
                ) : null}
                {showCompletedToggle ? (
                  <IconButton
                    label={showCompletedTasks ? L.hideCompletedTasks : L.showCompletedTasks}
                    onClick={toggleShowCompletedTasks}
                    icon={<CheckCircle2 aria-hidden />}
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
                      <RefreshCw className={cn(listRefreshing && "animate-spin")} aria-hidden />
                    }
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
      <TasksEditDialog
        dialog={editDialog}
        task={editingTask}
        taskLists={taskLists}
        labels={L}
        onClose={closeEditTask}
        onSave={(input) => {
          void saveEditedTask(input);
        }}
      />
      <TaskProjectCreateDialog
        open={createProjectDialog}
        onClose={() => setCreateProjectDialog(false)}
        onConfirm={(name, color) => void createProject(name, color)}
        labels={{
          title: L.newProject,
          nameLabel: L.projectNameLabel,
          colorLabel: L.projectColorLabel,
          createButton: L.createProjectButton,
          cancel: L.cancel,
        }}
        contentClassName="tasks-dialog-surface"
      />
      <EditDialog
        item={projectRenameDialog ? { kind: "project", name: projectRenameDialog.name } : null}
        title={L.renameProject}
        onClose={() => setProjectRenameDialog(null)}
        onConfirm={(newName) => {
          if (!projectRenameDialog) return;
          void renameProject(projectRenameDialog.listId, newName);
        }}
        contentClassName="tasks-dialog-surface"
      />
    </TooltipProvider>
  );
}

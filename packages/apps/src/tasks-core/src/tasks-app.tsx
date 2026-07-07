import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";
import type { TasksApiSource } from "@/tasks-core/src/tasks-api-source";
import { TasksWorkspace } from "@/tasks-core/src/tasks-workspace";
import { useTasksAPI } from "@/tasks-core/src/use-tasks-api";
import { useTasksRouteSync } from "@/tasks-core/src/use-tasks-route-sync";

export type TasksAppProps = {
  apiSource?: TasksApiSource;
};

export function TasksApp({ apiSource }: TasksAppProps = {}) {
  const { initialView, handleViewChange } = useTasksRouteSync();
  const {
    phase,
    error,
    retry,
    successVersion,
    bootstrapRevision,
    listRefreshing,
    refreshList,
    data,
    session,
    operations,
  } = useTasksAPI(apiSource);

  const tasksDisabled =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    (error as Error).message === "TASKS_SETTINGS_MISSING";

  return (
    <WorkspaceLiveAppShell
      phase={tasksDisabled ? "ready" : phase}
      error={tasksDisabled ? null : error}
      retry={retry}
      errorTitle={defaultTasksLabels.tasksDisabledTitle}
      successVersion={successVersion}
      render={(key) =>
        tasksDisabled ? (
          <div className="flex min-h-dvh items-center justify-center p-8 text-center">
            <div>
              <h1 className="text-lg font-semibold">{defaultTasksLabels.tasksDisabledTitle}</h1>
              <p className="mt-2 text-sm opacity-70">{defaultTasksLabels.tasksDisabledMessage}</p>
            </div>
          </div>
        ) : (
          <TasksWorkspace
            key={key}
            data={data}
            session={session}
            operations={operations}
            listRefreshing={listRefreshing}
            bootstrapRevision={bootstrapRevision}
            onRefreshList={refreshList}
            initialView={initialView}
            onViewChange={handleViewChange}
            onLogout={() => {
              window.location.assign("/logout");
            }}
          />
        )
      }
    />
  );
}

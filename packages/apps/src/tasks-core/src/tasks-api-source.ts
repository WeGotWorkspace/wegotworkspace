import { createTasksAppBootstrap, type TasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { fetchTasksLiveBootstrap } from "@/lib/api/wgw/tasks";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import type { Task, TaskCreate, TaskPatch, TasksAPIOperations } from "@/tasks-core/src/tasks-types";
import { taskAlertsFromList } from "@/tasks-core/src/tasks-task-utils";
import * as tasksApi from "@/lib/api/wgw/tasks";

export type TasksApiSource = {
  loadBootstrap: () => Promise<TasksAppBootstrap>;
  createOperations: (bootstrap?: TasksAppBootstrap) => TasksAPIOperations | undefined;
};

function createLiveTasksOperations(refresh: () => Promise<TasksAppBootstrap>): TasksAPIOperations {
  return {
    createTask: async (body: TaskCreate) => {
      const task = await tasksApi.createTask(body);
      await refresh();
      return task;
    },
    patchTask: async (taskId: string, patch: TaskPatch, opts) => {
      const task = await tasksApi.patchTask(taskId, patch, opts);
      await refresh();
      return task;
    },
    deleteTask: async (taskId: string, opts) => {
      await tasksApi.deleteTask(taskId, opts);
      await refresh();
    },
    moveTaskToList: async (taskId: string, taskListId: string, opts) => {
      await tasksApi.patchTask(taskId, {} as TaskPatch, opts);
      await refresh();
      const cached = await refresh();
      const task = cached.data.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Task not found");
      return { ...task, taskListId };
    },
  };
}

function createMockTasksOperations(
  getBootstrap: () => TasksAppBootstrap,
  setBootstrap: (next: TasksAppBootstrap) => void,
): TasksAPIOperations {
  const updateTasks = (updater: (tasks: Task[]) => Task[]) => {
    const current = getBootstrap();
    setBootstrap({
      ...current,
      data: { ...current.data, tasks: updater(current.data.tasks) },
    });
  };

  return {
    createTask: async (body) => {
      const listId = Object.keys(body.taskListIds).find((id) => body.taskListIds[id]) ?? "default";
      const created: Task = {
        "@type": "Task",
        id: `task-${Date.now()}`,
        taskListId: listId,
        uid: `urn:uuid:${crypto.randomUUID()}`,
        title: body.title,
        description: body.description ?? null,
        due: body.due ?? null,
        workflowStatus: body.workflowStatus ?? "needs-action",
        priority: body.priority ?? null,
        isDraft: false,
        sortOrder: 0,
        categories: body.categories ?? [],
        alerts: body.alerts
          ? taskAlertsFromList(
              Array.isArray(body.alerts) ? body.alerts : Object.values(body.alerts),
            )
          : undefined,
      };
      updateTasks((tasks) => [created, ...tasks]);
      return created;
    },
    patchTask: async (taskId, patch) => {
      let updated: Task | null = null;
      updateTasks((tasks) =>
        tasks.map((task) => {
          if (task.id !== taskId) return task;
          const listId =
            patch && "taskListId" in patch && typeof patch.taskListId === "string"
              ? patch.taskListId
              : task.taskListId;
          updated = {
            ...task,
            ...patch,
            taskListId: listId,
            categories: patch.categories ?? task.categories,
            alerts: patch.alerts ?? task.alerts,
          };
          return updated;
        }),
      );
      if (!updated) throw new Error("Task not found");
      return updated;
    },
    deleteTask: async (taskId) => {
      updateTasks((tasks) => tasks.filter((task) => task.id !== taskId));
    },
    moveTaskToList: async (taskId, taskListId) => {
      let updated: Task | null = null;
      updateTasks((tasks) =>
        tasks.map((task) => {
          if (task.id !== taskId) return task;
          updated = { ...task, taskListId };
          return updated;
        }),
      );
      if (!updated) throw new Error("Task not found");
      return updated;
    },
  };
}

export function createDefaultTasksApiSource(): TasksApiSource {
  let mockBootstrap = createTasksAppBootstrap();

  return createWorkspaceSource<TasksApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(mockBootstrap),
      createOperations: () =>
        createMockTasksOperations(
          () => mockBootstrap,
          (next) => {
            mockBootstrap = next;
          },
        ),
    }),
    createLiveSource: () => {
      let cached: TasksAppBootstrap | undefined;
      const refresh = async () => {
        cached = await fetchTasksLiveBootstrap();
        return cached;
      };
      return {
        loadBootstrap: refresh,
        createOperations: () => createLiveTasksOperations(refresh),
      };
    },
  });
}

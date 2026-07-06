import type {
  Task,
  TaskAlert,
  TaskCreate,
  TaskList,
  TaskPatch,
} from "@wgw-api-generated/tasks-types";

export type { Task, TaskAlert, TaskCreate, TaskList, TaskPatch };

export type TasksUIData = {
  taskLists: TaskList[];
  tasks: Task[];
};

export type TasksMutationOpts = {
  signal?: AbortSignal;
  ifMatch?: string;
};

/**
 * Backend-agnostic task operations consumed by tasks UI/controller.
 */
export type TasksAPIOperations = {
  createTask: (body: TaskCreate, opts?: TasksMutationOpts) => Promise<Task>;
  patchTask: (taskId: string, patch: TaskPatch, opts?: TasksMutationOpts) => Promise<Task>;
  deleteTask: (taskId: string, opts?: TasksMutationOpts) => Promise<void>;
  moveTaskToList: (taskId: string, taskListId: string, opts?: TasksMutationOpts) => Promise<Task>;
};

import type { Task, TaskList } from "@wgw-api-generated/tasks-types";
import type { TasksUIData } from "@/tasks-core/src/tasks-types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";

export type TasksAppBootstrap = {
  data: TasksUIData;
  session: WorkspaceSession;
};

const fullRights: TaskList["myRights"] = {
  mayReadItems: true,
  mayWriteAll: true,
  mayWriteOwn: true,
  mayUpdatePrivate: true,
  mayRSVP: true,
  mayAdmin: true,
  mayDelete: true,
};

const mockTaskLists: TaskList[] = [
  {
    id: "default",
    name: "Personal",
    description: null,
    sortOrder: 0,
    isDefault: true,
    isSubscribed: true,
    shareWith: null,
    myRights: fullRights,
  },
  {
    id: "work",
    name: "Work",
    description: null,
    sortOrder: 1,
    isDefault: false,
    isSubscribed: true,
    shareWith: null,
    myRights: fullRights,
  },
];

const mockTasks: Task[] = [
  {
    "@type": "Task",
    id: "task-buy-milk",
    taskListId: "default",
    uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440001",
    title: "Buy milk",
    description: "2% organic",
    due: new Date(Date.now() + 86_400_000).toISOString().slice(0, 19),
    workflowStatus: "needs-action",
    priority: 5,
    isDraft: false,
    sortOrder: 0,
    categories: ["errands"],
    alerts: undefined,
  },
  {
    "@type": "Task",
    id: "task-review-spec",
    taskListId: "work",
    uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440002",
    title: "Review API spec",
    description: null,
    due: new Date(Date.now() + 172_800_000).toISOString().slice(0, 19),
    workflowStatus: "in-process",
    priority: 1,
    isDraft: false,
    sortOrder: 1,
    categories: ["work", "review"],
    alerts: {
      alert1: {
        "@type": "Alert",
        trigger: { "@type": "OffsetTrigger", offset: "-PT30M", relativeTo: "end" },
        action: "display",
      },
    },
  },
  {
    "@type": "Task",
    id: "task-overdue",
    taskListId: "default",
    uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440003",
    title: "Overdue example",
    due: new Date(Date.now() - 86_400_000).toISOString().slice(0, 19),
    workflowStatus: "needs-action",
    isDraft: false,
    sortOrder: 2,
    categories: [],
    alerts: undefined,
  },
  {
    "@type": "Task",
    id: "task-done",
    taskListId: "work",
    uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440004",
    title: "Ship v0.9",
    completed: new Date().toISOString().slice(0, 19),
    workflowStatus: "completed",
    isDraft: false,
    sortOrder: 3,
    categories: ["work"],
    alerts: undefined,
  },
];

export function createTasksAppBootstrap(overrides?: Partial<TasksAppBootstrap>): TasksAppBootstrap {
  return {
    data: {
      taskLists: mockTaskLists,
      tasks: mockTasks,
    },
    session: mockWorkspaceSession,
    ...overrides,
  };
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchTasksLiveBootstrap = vi.fn();

vi.mock("@/lib/api/wgw/http", () => ({
  wgwLiveApiEnabled: () => false,
}));

vi.mock("@/lib/api/wgw/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/wgw/tasks")>();
  return {
    ...actual,
    fetchTasksLiveBootstrap: (...args: unknown[]) => mockFetchTasksLiveBootstrap(...args),
  };
});

import { createDefaultTasksApiSource } from "./tasks-api-source";

describe("tasks-api-source mock operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patchTask updates bootstrap in memory and does not refetch", async () => {
    const source = createDefaultTasksApiSource();
    const bootstrap = await source.loadBootstrap();
    const operations = source.createOperations();
    const taskId = bootstrap.data.tasks[0]!.id;

    const result = await operations!.patchTask(taskId, { workflowStatus: "completed" });

    expect(result.workflowStatus).toBe("completed");
    expect(mockFetchTasksLiveBootstrap).not.toHaveBeenCalled();
  });

  it("createTask appends to bootstrap and does not refetch", async () => {
    const source = createDefaultTasksApiSource();
    const bootstrap = await source.loadBootstrap();
    const operations = source.createOperations();
    const beforeCount = bootstrap.data.tasks.length;

    const result = await operations!.createTask({
      title: "New task",
      taskListIds: { inbox: true },
    });

    expect(result.title).toBe("New task");
    const afterBootstrap = await source.loadBootstrap();
    expect(afterBootstrap.data.tasks).toHaveLength(beforeCount + 1);
    expect(mockFetchTasksLiveBootstrap).not.toHaveBeenCalled();
  });

  it("deleteTask removes from bootstrap and does not refetch", async () => {
    const source = createDefaultTasksApiSource();
    const bootstrap = await source.loadBootstrap();
    const operations = source.createOperations();
    const taskId = bootstrap.data.tasks[0]!.id;

    await operations!.deleteTask(taskId);

    const afterBootstrap = await source.loadBootstrap();
    expect(afterBootstrap.data.tasks.some((task) => task.id === taskId)).toBe(false);
    expect(mockFetchTasksLiveBootstrap).not.toHaveBeenCalled();
  });
});

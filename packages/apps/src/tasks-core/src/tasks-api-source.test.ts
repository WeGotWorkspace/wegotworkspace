import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/tasks-core/src/tasks-types";

const mockFetchTasksLiveBootstrap = vi.fn();
const mockCreateTask = vi.fn();
const mockPatchTask = vi.fn();
const mockDeleteTask = vi.fn();

vi.mock("@/lib/api/wgw/http", () => ({
  wgwLiveApiEnabled: () => true,
}));

vi.mock("@/lib/api/wgw/tasks", () => ({
  fetchTasksLiveBootstrap: (...args: unknown[]) => mockFetchTasksLiveBootstrap(...args),
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  patchTask: (...args: unknown[]) => mockPatchTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
}));

vi.mock("@/lib/api/create-workspace-source", () => ({
  createWorkspaceSource: <TSource>({ createLiveSource }: { createLiveSource: () => TSource }) =>
    createLiveSource(),
}));

import { createDefaultTasksApiSource } from "./tasks-api-source";

describe("tasks-api-source live operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patchTask calls the API only and does not refetch bootstrap", async () => {
    const patched = { id: "task-1", title: "Done" } as Task;
    mockPatchTask.mockResolvedValue(patched);

    const source = createDefaultTasksApiSource();
    const operations = source.createOperations();
    const result = await operations!.patchTask("task-1", { workflowStatus: "completed" });

    expect(result).toBe(patched);
    expect(mockPatchTask).toHaveBeenCalledTimes(1);
    expect(mockFetchTasksLiveBootstrap).not.toHaveBeenCalled();
  });

  it("createTask calls the API only and does not refetch bootstrap", async () => {
    const created = { id: "task-2", title: "New task" } as Task;
    mockCreateTask.mockResolvedValue(created);

    const source = createDefaultTasksApiSource();
    const operations = source.createOperations();
    const result = await operations!.createTask({
      title: "New task",
      taskListIds: { inbox: true },
    });

    expect(result).toBe(created);
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockFetchTasksLiveBootstrap).not.toHaveBeenCalled();
  });

  it("deleteTask calls the API only and does not refetch bootstrap", async () => {
    mockDeleteTask.mockResolvedValue(undefined);

    const source = createDefaultTasksApiSource();
    const operations = source.createOperations();
    await operations!.deleteTask("task-3");

    expect(mockDeleteTask).toHaveBeenCalledTimes(1);
    expect(mockFetchTasksLiveBootstrap).not.toHaveBeenCalled();
  });
});

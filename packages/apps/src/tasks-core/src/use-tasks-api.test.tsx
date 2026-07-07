import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { useTasksAPI } from "./use-tasks-api";
import type { TasksApiSource } from "./tasks-api-source";

const bootstrap = createTasksAppBootstrap();
const mockPatchBootstrap = vi.fn();
const mockLoadBootstrap = vi.fn();

vi.mock("@/lib/live/use-hybrid-bootstrap", () => ({
  useHybridBootstrap: () => ({
    phase: "ready",
    error: null,
    data: bootstrap,
    load: vi.fn(),
    successVersion: 1,
    patchBootstrap: mockPatchBootstrap,
  }),
}));

describe("useTasksAPI", () => {
  beforeEach(() => {
    mockPatchBootstrap.mockReset();
    mockLoadBootstrap.mockReset();
    mockLoadBootstrap.mockResolvedValue(bootstrap);
  });

  it("refreshList reloads bootstrap and patches workspace data", async () => {
    const source: TasksApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createOperations: () => undefined,
    };

    const { result } = renderHook(() => useTasksAPI(source));

    act(() => {
      result.current.refreshList();
    });

    expect(result.current.listLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.listLoading).toBe(false);
    });

    expect(mockLoadBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap.mock.calls[0]?.[0]()).toEqual(bootstrap);
  });
});

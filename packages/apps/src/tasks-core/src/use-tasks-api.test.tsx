import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";
import { useTasksAPI } from "./use-tasks-api";
import type { TasksApiSource } from "./tasks-api-source";

const bootstrap = createTasksAppBootstrap();
const mockPatchBootstrap = vi.fn();
const mockLoadBootstrap = vi.fn();
const mockShow = vi.fn();
const mockShowError = vi.fn();

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

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({
    show: mockShow,
    showError: mockShowError,
    showSuccess: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe("useTasksAPI", () => {
  beforeEach(() => {
    mockPatchBootstrap.mockReset();
    mockLoadBootstrap.mockReset();
    mockShow.mockReset();
    mockShowError.mockReset();
    mockLoadBootstrap.mockResolvedValue(bootstrap);
  });

  it("refreshList reloads bootstrap in the background without list loading state", async () => {
    const source: TasksApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createOperations: () => undefined,
    };

    const { result } = renderHook(() => useTasksAPI(source));

    act(() => {
      result.current.refreshList();
    });

    expect(result.current.listLoading).toBe(false);
    expect(result.current.listRefreshing).toBe(true);

    await waitFor(() => {
      expect(result.current.listRefreshing).toBe(false);
    });

    expect(mockLoadBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap.mock.calls[0]?.[0]()).toEqual(bootstrap);
    expect(mockShow).toHaveBeenCalledWith(
      defaultTasksLabels.toastListUpdated,
      expect.objectContaining({ icon: expect.anything() }),
    );
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it("refreshList shows an error toast when bootstrap reload fails", async () => {
    mockLoadBootstrap.mockRejectedValue(new Error("network"));
    const source: TasksApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createOperations: () => undefined,
    };

    const { result } = renderHook(() => useTasksAPI(source));

    act(() => {
      result.current.refreshList();
    });

    await waitFor(() => {
      expect(result.current.listRefreshing).toBe(false);
    });

    expect(mockShow).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith(defaultTasksLabels.toastListRefreshFailed);
  });
});

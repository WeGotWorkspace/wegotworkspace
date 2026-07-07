import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { INBOX_TASK_LIST_ID } from "@/tasks-core/src/tasks-task-utils";
import { useTasksController } from "@/tasks-core/src/use-tasks-controller";

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({
    show: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-confirm-dialog", () => ({
  useConfirmDialog: () => ({
    confirmDialog: null,
    requestConfirm: vi.fn(),
  }),
}));

const bootstrap = createTasksAppBootstrap();

describe("useTasksController URL routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("initialView seeds the controller view on mount", () => {
    const { result } = renderHook(() =>
      useTasksController({ data: bootstrap.data, listLoading: false, initialView: "state:today" }),
    );

    expect(result.current.view).toBe("state:today");
  });

  it("syncs view when initialView changes from the URL", () => {
    const { result, rerender } = renderHook(
      ({ initialView }: { initialView: string }) =>
        useTasksController({ data: bootstrap.data, listLoading: false, initialView }),
      { initialProps: { initialView: "state:all" } },
    );

    expect(result.current.view).toBe("state:all");

    rerender({ initialView: "state:overdue" });

    expect(result.current.view).toBe("state:overdue");
  });

  it("onViewChange is called when selectView is invoked (not on mount)", () => {
    const onViewChange = vi.fn();
    const { result } = renderHook(() =>
      useTasksController({ data: bootstrap.data, listLoading: false, onViewChange }),
    );

    expect(onViewChange).not.toHaveBeenCalled();

    act(() => {
      result.current.selectView("state:today");
    });

    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith("state:today");
  });

  it("does not revert optimistic selection when initialView is stale during navigation", () => {
    const onViewChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ initialView }: { initialView: string }) =>
        useTasksController({ data: bootstrap.data, listLoading: false, initialView, onViewChange }),
      { initialProps: { initialView: "state:all" } },
    );

    act(() => {
      result.current.selectView(`list:${INBOX_TASK_LIST_ID}`);
    });

    expect(result.current.view).toBe(`list:${INBOX_TASK_LIST_ID}`);
    expect(onViewChange).toHaveBeenCalledWith(`list:${INBOX_TASK_LIST_ID}`);

    rerender({ initialView: "state:today" });

    expect(result.current.view).toBe(`list:${INBOX_TASK_LIST_ID}`);
    expect(onViewChange).toHaveBeenLastCalledWith(`list:${INBOX_TASK_LIST_ID}`);
  });

  it("clears pending navigation once the URL catches up", () => {
    const onViewChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ initialView }: { initialView: string }) =>
        useTasksController({ data: bootstrap.data, listLoading: false, initialView, onViewChange }),
      { initialProps: { initialView: "state:all" } },
    );

    act(() => {
      result.current.selectView("state:upcoming");
    });

    rerender({ initialView: "state:upcoming" });

    expect(result.current.view).toBe("state:upcoming");

    act(() => {
      result.current.selectView("state:all");
    });
    rerender({ initialView: "state:all" });

    expect(result.current.view).toBe("state:all");
    expect(onViewChange).toHaveBeenLastCalledWith("state:all");
  });
});

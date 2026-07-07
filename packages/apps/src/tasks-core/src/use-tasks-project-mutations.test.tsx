import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { useTasksProjectMutations } from "@/tasks-core/src/use-tasks-project-mutations";
import { useTasksShell } from "@/tasks-core/src/use-tasks-shell";

const bootstrap = createTasksAppBootstrap();

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({
    show: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

function renderProjectMutations(
  operations?: ReturnType<typeof useTasksShell> extends never
    ? never
    : Parameters<typeof useTasksShell>[0]["operations"],
  initialView?: string,
) {
  const { result: shellResult } = renderHook(() =>
    useTasksShell({
      data: bootstrap.data,
      operations,
      initialView,
    }),
  );

  const { result, rerender } = renderHook(({ shell }) => useTasksProjectMutations({ shell }), {
    initialProps: { shell: shellResult.current },
  });

  rerender({ shell: shellResult.current });

  return { result, shell: shellResult };
}

describe("useTasksProjectMutations", () => {
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

  it("canManageProjects requires create and patch list operations", () => {
    const { result } = renderProjectMutations({
      createTask: vi.fn(),
      patchTask: vi.fn(),
      deleteTask: vi.fn(),
      moveTaskToList: vi.fn(),
      createTaskList: vi.fn(),
      patchTaskList: vi.fn(),
    });

    expect(result.current.canManageProjects).toBe(true);
  });

  it("canRenameProject is false for protected inbox list", () => {
    const { result } = renderProjectMutations(
      {
        createTask: vi.fn(),
        patchTask: vi.fn(),
        deleteTask: vi.fn(),
        moveTaskToList: vi.fn(),
        createTaskList: vi.fn(),
        patchTaskList: vi.fn(),
      },
      "list:inbox",
    );

    expect(result.current.canRenameProject).toBe(false);
  });

  it("createProject appends list and navigates to it", async () => {
    const created = {
      "@type": "TaskList" as const,
      id: "list-new",
      name: "Launch",
      color: "#6366f1",
      isDefault: false,
    };
    const createTaskList = vi.fn().mockResolvedValue(created);
    const { result, shell } = renderProjectMutations({
      createTask: vi.fn(),
      patchTask: vi.fn(),
      deleteTask: vi.fn(),
      moveTaskToList: vi.fn(),
      createTaskList,
      patchTaskList: vi.fn(),
    });

    await act(async () => {
      await result.current.createProject({
        name: "Launch",
        color: "#6366f1",
        groupSlug: null,
      });
    });

    expect(createTaskList).toHaveBeenCalledWith({
      name: "Launch",
      color: "#6366f1",
    });
    expect(shell.current.taskLists.some((list) => list.id === "list-new")).toBe(true);
    expect(shell.current.view).toBe("list:list-new");
    expect(result.current.projectDialog).toBe(null);
  });

  it("createProject forwards groupSlug to the API", async () => {
    const createTaskList = vi.fn().mockResolvedValue({
      "@type": "TaskList" as const,
      id: "roadmap",
      name: "Roadmap",
      color: "#22c55e",
      scope: "group",
      groupSlug: "team",
      isDefault: false,
    });
    const { result } = renderProjectMutations({
      createTask: vi.fn(),
      patchTask: vi.fn(),
      deleteTask: vi.fn(),
      moveTaskToList: vi.fn(),
      createTaskList,
      patchTaskList: vi.fn(),
    });

    await act(async () => {
      await result.current.createProject({
        name: "Roadmap",
        color: "#22c55e",
        groupSlug: "team",
      });
    });

    expect(createTaskList).toHaveBeenCalledWith({
      name: "Roadmap",
      color: "#22c55e",
      groupSlug: "team",
    });
  });

  it("updateProject patches name and color", async () => {
    const patchTaskList = vi.fn().mockResolvedValue({
      "@type": "TaskList" as const,
      id: "default",
      name: "Client work",
      color: "#22c55e",
      isDefault: false,
    });
    const { result } = renderProjectMutations(
      {
        createTask: vi.fn(),
        patchTask: vi.fn(),
        deleteTask: vi.fn(),
        moveTaskToList: vi.fn(),
        createTaskList: vi.fn(),
        patchTaskList,
      },
      "list:default",
    );

    await act(async () => {
      await result.current.updateProject("default", {
        name: "Client work",
        color: "#22c55e",
      });
    });

    expect(patchTaskList).toHaveBeenCalledWith("default", {
      name: "Client work",
      color: "#22c55e",
    });
    expect(result.current.projectDialog).toBe(null);
  });

  it("updateProject skips protected lists and unchanged payloads", async () => {
    const patchTaskList = vi.fn();
    const { result } = renderProjectMutations(
      {
        createTask: vi.fn(),
        patchTask: vi.fn(),
        deleteTask: vi.fn(),
        moveTaskToList: vi.fn(),
        createTaskList: vi.fn(),
        patchTaskList,
      },
      "list:inbox",
    );

    await act(async () => {
      await result.current.updateProject("inbox", {
        name: "Inbox",
        color: null,
      });
    });

    expect(patchTaskList).not.toHaveBeenCalled();
  });
});

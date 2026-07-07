import type React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { TasksMainView } from "@/tasks-core/src/tasks-main-view";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";
import { TooltipProvider } from "@/ui/tooltip";

const bootstrap = createTasksAppBootstrap();

function renderMainView(
  overrides: Partial<React.ComponentProps<typeof TasksMainView>> = {},
  onCreateTask = vi.fn(),
) {
  return render(
    <TooltipProvider>
      <TasksMainView
        L={defaultTasksLabels}
        displayTasks={[]}
        exitingTaskIds={new Set<string>()}
        taskLists={bootstrap.data.taskLists}
        defaultListId="default"
        canCreate
        onToggleComplete={vi.fn()}
        onEditTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onCreateTask={onCreateTask}
        onTaskExitAnimationEnd={vi.fn()}
        itemDragHandlers={() => ({})}
        isItemDragging={() => false}
        {...overrides}
      />
    </TooltipProvider>,
  );
}

function renderComposer(onCreateTask = vi.fn()) {
  return renderMainView({}, onCreateTask);
}

describe("TasksMainView composer", () => {
  beforeEach(() => {
    cleanup();
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

  it("keeps description editable after title blur", () => {
    renderComposer();

    const title = screen.getByLabelText(defaultTasksLabels.addTaskName);
    fireEvent.focus(title);

    const description = screen.getByLabelText(defaultTasksLabels.descriptionLabel);
    fireEvent.blur(title);
    fireEvent.change(description, { target: { value: "Follow up tomorrow" } });

    expect((description as HTMLTextAreaElement).value).toBe("Follow up tomorrow");
  });

  it("toggles complete when clicking the task row body", () => {
    const onToggleComplete = vi.fn();
    const task = bootstrap.data.tasks[0];
    renderMainView({ displayTasks: [task], onToggleComplete });

    fireEvent.click(screen.getByText(task.title));

    expect(onToggleComplete).toHaveBeenCalledTimes(1);
    expect(onToggleComplete).toHaveBeenCalledWith(task.id);
  });

  it("toggles complete when clicking the checkbox without double-firing", () => {
    const onToggleComplete = vi.fn();
    const task = bootstrap.data.tasks[0];
    renderMainView({ displayTasks: [task], onToggleComplete });

    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.markComplete }));

    expect(onToggleComplete).toHaveBeenCalledTimes(1);
    expect(onToggleComplete).toHaveBeenCalledWith(task.id);
  });

  it("does not toggle complete when clicking task actions", () => {
    const onToggleComplete = vi.fn();
    const task = bootstrap.data.tasks[0];
    renderMainView({ displayTasks: [task], onToggleComplete });

    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.taskActions }));

    expect(onToggleComplete).not.toHaveBeenCalled();
  });

  it("submits description with createTask when filled", () => {
    const onCreateTask = vi.fn();
    renderComposer(onCreateTask);

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.addTaskName), {
      target: { value: "New task" },
    });
    fireEvent.focus(screen.getByLabelText(defaultTasksLabels.addTaskName));

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.descriptionLabel), {
      target: { value: "Details here" },
    });
    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.addTaskButton }));

    expect(onCreateTask).toHaveBeenCalledWith({
      title: "New task",
      description: "Details here",
      listId: "default",
      tag: "",
    });
  });

  it("submits task when pressing Enter in description with non-empty title", () => {
    const onCreateTask = vi.fn();
    renderComposer(onCreateTask);

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.addTaskName), {
      target: { value: "New task" },
    });
    fireEvent.focus(screen.getByLabelText(defaultTasksLabels.addTaskName));

    const description = screen.getByLabelText(defaultTasksLabels.descriptionLabel);
    fireEvent.change(description, { target: { value: "Details here" } });
    fireEvent.keyDown(description, { key: "Enter", shiftKey: false });

    expect(onCreateTask).toHaveBeenCalledTimes(1);
    expect(onCreateTask).toHaveBeenCalledWith({
      title: "New task",
      description: "Details here",
      listId: "default",
      tag: "",
    });
    expect((screen.getByLabelText(defaultTasksLabels.addTaskName) as HTMLInputElement).value).toBe(
      "",
    );
    expect(screen.queryByLabelText(defaultTasksLabels.descriptionLabel)).toBeNull();
  });

  it("does not submit when pressing Enter in description with empty title", () => {
    const onCreateTask = vi.fn();
    renderComposer(onCreateTask);

    fireEvent.focus(screen.getByLabelText(defaultTasksLabels.addTaskName));

    const description = screen.getByLabelText(defaultTasksLabels.descriptionLabel);
    fireEvent.change(description, { target: { value: "Details only" } });
    fireEvent.keyDown(description, { key: "Enter", shiftKey: false });

    expect(onCreateTask).not.toHaveBeenCalled();
    expect((description as HTMLTextAreaElement).value).toBe("Details only");
  });

  it("allows newline when pressing Shift+Enter in description", () => {
    renderComposer();

    fireEvent.focus(screen.getByLabelText(defaultTasksLabels.addTaskName));

    const description = screen.getByLabelText(defaultTasksLabels.descriptionLabel);
    fireEvent.change(description, { target: { value: "Line one" } });
    fireEvent.keyDown(description, { key: "Enter", shiftKey: true });
    fireEvent.change(description, { target: { value: "Line one\nLine two" } });

    expect((description as HTMLTextAreaElement).value).toBe("Line one\nLine two");
  });

  it("shows a plus icon marker in the composer instead of a checkbox", () => {
    renderComposer();

    expect(screen.queryByRole("button", { name: defaultTasksLabels.markComplete })).toBeNull();

    const composer = document.querySelector(".tasks-main-view__composer");
    const marker = composer?.querySelector(".tasks-main-view__composer-marker svg");
    expect(marker).toBeTruthy();
    expect(marker?.classList.contains("lucide-plus")).toBe(true);
  });
});

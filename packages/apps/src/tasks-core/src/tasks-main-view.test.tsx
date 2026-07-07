import type React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { TasksMainView } from "@/tasks-core/src/tasks-main-view";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";

const bootstrap = createTasksAppBootstrap();

function renderMainView(
  overrides: Partial<React.ComponentProps<typeof TasksMainView>> = {},
  onCreateTask = vi.fn(),
) {
  return render(
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
    />,
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
});

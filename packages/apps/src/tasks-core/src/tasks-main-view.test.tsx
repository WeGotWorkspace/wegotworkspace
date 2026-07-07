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
      workflowStatus: "needs-action",
      priority: 0,
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
      workflowStatus: "needs-action",
      priority: 0,
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

  it("defaults status to needs action in the composer", () => {
    renderComposer();

    const statusTrigger = screen.getByLabelText(defaultTasksLabels.addTaskStatus);
    expect(statusTrigger.textContent).toContain(defaultTasksLabels.stateNeedsAction);
    expect(statusTrigger.querySelector(".lucide-clock")).toBeTruthy();
  });

  it("shows only needs-action and in-process in the composer status dropdown", () => {
    renderComposer();

    fireEvent.click(screen.getByLabelText(defaultTasksLabels.addTaskStatus));

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      defaultTasksLabels.stateNeedsAction,
      defaultTasksLabels.stateInProcess,
    ]);

    expect(
      screen
        .getByRole("option", { name: defaultTasksLabels.stateNeedsAction })
        .querySelector(".lucide-clock"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("option", { name: defaultTasksLabels.stateInProcess })
        .querySelector(".lucide-circle-dot"),
    ).toBeTruthy();
    expect(screen.queryByRole("option", { name: defaultTasksLabels.stateCompleted })).toBeNull();
    expect(screen.queryByRole("option", { name: defaultTasksLabels.stateCancelled })).toBeNull();
  });

  it("submits selected workflowStatus with createTask", () => {
    const onCreateTask = vi.fn();
    renderComposer(onCreateTask);

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.addTaskName), {
      target: { value: "In progress task" },
    });

    fireEvent.click(screen.getByLabelText(defaultTasksLabels.addTaskStatus));
    fireEvent.click(screen.getByRole("option", { name: defaultTasksLabels.stateInProcess }));

    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.addTaskButton }));

    expect(onCreateTask).toHaveBeenCalledWith({
      title: "In progress task",
      description: "",
      listId: "default",
      workflowStatus: "in-process",
      priority: 0,
    });
  });

  it("defaults priority to none in the composer", () => {
    renderComposer();

    const priorityTrigger = screen.getByLabelText(defaultTasksLabels.addTaskPriority);
    expect(priorityTrigger.textContent).toContain(defaultTasksLabels.priorityNone);
    expect(priorityTrigger.querySelector(".lucide-flag")).toBeTruthy();
  });

  it("shows only none, high, medium, and low in the composer priority dropdown", () => {
    renderComposer();

    fireEvent.click(screen.getByLabelText(defaultTasksLabels.addTaskPriority));

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(4);
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      defaultTasksLabels.priorityNone,
      defaultTasksLabels.priorityHigh,
      defaultTasksLabels.priorityMedium,
      defaultTasksLabels.priorityLow,
    ]);
  });

  it("submits selected priority with createTask", () => {
    const onCreateTask = vi.fn();
    renderComposer(onCreateTask);

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.addTaskName), {
      target: { value: "Urgent task" },
    });

    fireEvent.click(screen.getByLabelText(defaultTasksLabels.addTaskPriority));
    fireEvent.click(screen.getByRole("option", { name: defaultTasksLabels.priorityHigh }));

    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.addTaskButton }));

    expect(onCreateTask).toHaveBeenCalledWith({
      title: "Urgent task",
      description: "",
      listId: "default",
      workflowStatus: "needs-action",
      priority: 1,
    });
  });
});

describe("TasksMainView task rows", () => {
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

  it("shows workflow status icon and label on task rows", () => {
    const task = bootstrap.data.tasks.find((item) => item.workflowStatus === "in-process")!;
    renderMainView({ displayTasks: [task] });

    const row = screen.getByText(task.title).closest(".tasks-main-view__row");
    expect(row).toBeTruthy();
    const meta = row?.querySelector(".tasks-main-view__meta");
    expect(meta?.textContent).toContain(defaultTasksLabels.stateInProcess);
    expect(meta?.querySelector(".lucide-circle-dot")).toBeTruthy();
  });

  it("defaults missing workflowStatus to needs action on task rows", () => {
    const task = { ...bootstrap.data.tasks[0], workflowStatus: undefined };
    renderMainView({ displayTasks: [task] });

    const row = screen.getByText(task.title).closest(".tasks-main-view__row");
    const meta = row?.querySelector(".tasks-main-view__meta");
    expect(meta?.textContent).toContain(defaultTasksLabels.stateNeedsAction);
    expect(meta?.querySelector(".lucide-clock")).toBeTruthy();
  });

  it("shows priority flag in meta when task has priority", () => {
    const task = { ...bootstrap.data.tasks[0], priority: 1 };
    renderMainView({ displayTasks: [task] });

    const row = screen.getByText(task.title).closest(".tasks-main-view__row");
    const meta = row?.querySelector(".tasks-main-view__meta");
    expect(meta?.textContent).toContain(defaultTasksLabels.priorityHigh);
    expect(meta?.querySelector(".lucide-flag")).toBeTruthy();
  });

  it("hides priority meta when task priority is none", () => {
    const task = { ...bootstrap.data.tasks[0], priority: null };
    renderMainView({ displayTasks: [task] });

    const row = screen.getByText(task.title).closest(".tasks-main-view__row");
    const meta = row?.querySelector(".tasks-main-view__meta");
    expect(meta?.textContent).not.toContain(defaultTasksLabels.priorityHigh);
    expect(meta?.textContent).not.toContain(defaultTasksLabels.priorityMedium);
    expect(meta?.textContent).not.toContain(defaultTasksLabels.priorityLow);
  });
});

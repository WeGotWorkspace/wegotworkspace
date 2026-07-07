import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskProjectCreateDialog } from "@/tasks-core/src/task-project-create-dialog";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";

const labels = {
  title: defaultTasksLabels.newProject,
  nameLabel: defaultTasksLabels.projectNameLabel,
  colorLabel: defaultTasksLabels.projectColorLabel,
  createButton: defaultTasksLabels.createProjectButton,
  cancel: defaultTasksLabels.cancel,
};

describe("TaskProjectCreateDialog", () => {
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

  it("submits trimmed name and color", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <TaskProjectCreateDialog open onClose={onClose} onConfirm={onConfirm} labels={labels} />,
    );

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.projectNameLabel), {
      target: { value: "  Launch plan  " },
    });
    fireEvent.change(screen.getByLabelText(defaultTasksLabels.projectColorLabel), {
      target: { value: "#ff0000" },
    });
    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.createProjectButton }));

    expect(onConfirm).toHaveBeenCalledWith("Launch plan", "#ff0000");
  });

  it("disables create until a name is entered", () => {
    render(<TaskProjectCreateDialog open onClose={vi.fn()} onConfirm={vi.fn()} labels={labels} />);

    expect(
      (
        screen.getByRole("button", {
          name: defaultTasksLabels.createProjectButton,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();

    render(<TaskProjectCreateDialog open onClose={onClose} onConfirm={vi.fn()} labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.cancel }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

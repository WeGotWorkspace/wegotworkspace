import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskProjectDialog } from "@/tasks-core/src/task-project-dialog";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";
import { DEFAULT_TASK_LIST_COLOR } from "@/tasks-core/src/tasks-task-utils";

const dialogLabels = {
  createTitle: defaultTasksLabels.newProject,
  editTitle: defaultTasksLabels.renameProject,
  nameLabel: defaultTasksLabels.projectNameLabel,
  colorLabel: defaultTasksLabels.projectColorLabel,
  scopeLabel: defaultTasksLabels.projectScopeLabel,
  scopePersonal: defaultTasksLabels.projectScopePersonal,
  scopePersonalDescription: defaultTasksLabels.projectScopePersonalDescription,
  scopeGroup: defaultTasksLabels.projectScopeGroup,
  scopeReadOnlyLabel: defaultTasksLabels.projectScopeReadOnlyLabel,
  createButton: defaultTasksLabels.createProjectButton,
  saveButton: defaultTasksLabels.saveProjectButton,
  cancel: defaultTasksLabels.cancel,
};

const groups = [
  { slug: "team", displayName: "Team" },
  { slug: "studio", displayName: "Studio Crew" },
];

describe("TaskProjectDialog", () => {
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

  it("submits trimmed create payload with selected color and personal scope", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <TaskProjectDialog
        dialog={{ mode: "create" }}
        groups={groups}
        personalOwnerLabel="Demo User"
        onClose={onClose}
        onConfirm={onConfirm}
        labels={dialogLabels}
      />,
    );

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.projectNameLabel), {
      target: { value: "  Launch plan  " },
    });
    fireEvent.click(screen.getByRole("radio", { name: "#ec4899" }));
    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.createProjectButton }));

    expect(onConfirm).toHaveBeenCalledWith({
      name: "Launch plan",
      color: "#ec4899",
      groupSlug: null,
    });
  });

  it("submits group scope when a group is selected", () => {
    const onConfirm = vi.fn();

    render(
      <TaskProjectDialog
        dialog={{ mode: "create" }}
        groups={groups}
        personalOwnerLabel="Demo User"
        onClose={vi.fn()}
        onConfirm={onConfirm}
        labels={dialogLabels}
      />,
    );

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.projectNameLabel), {
      target: { value: "Roadmap" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: defaultTasksLabels.projectScopeLabel }));
    fireEvent.click(
      screen.getByRole("option", { name: defaultTasksLabels.projectScopeGroup("Team") }),
    );
    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.createProjectButton }));

    expect(onConfirm).toHaveBeenCalledWith({
      name: "Roadmap",
      color: DEFAULT_TASK_LIST_COLOR,
      groupSlug: "team",
    });
  });

  it("disables create until a name is entered", () => {
    render(
      <TaskProjectDialog
        dialog={{ mode: "create" }}
        groups={groups}
        personalOwnerLabel="Demo User"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        labels={dialogLabels}
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: defaultTasksLabels.createProjectButton,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows read-only owner on edit and submits name/color changes", () => {
    const onConfirm = vi.fn();

    render(
      <TaskProjectDialog
        dialog={{
          mode: "edit",
          listId: "work",
          name: "Work",
          color: "#6366f1",
          scope: "personal",
          groupSlug: null,
        }}
        groups={groups}
        personalOwnerLabel="Demo User"
        onClose={vi.fn()}
        onConfirm={onConfirm}
        labels={dialogLabels}
      />,
    );

    expect(screen.getByText(defaultTasksLabels.projectScopePersonal("Demo User"))).toBeTruthy();
    expect(screen.queryByLabelText(defaultTasksLabels.projectScopeLabel)).toBeNull();

    fireEvent.change(screen.getByLabelText(defaultTasksLabels.projectNameLabel), {
      target: { value: "Client work" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "#22c55e" }));
    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.saveProjectButton }));

    expect(onConfirm).toHaveBeenCalledWith({
      name: "Client work",
      color: "#22c55e",
    });
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();

    render(
      <TaskProjectDialog
        dialog={{ mode: "create" }}
        groups={groups}
        personalOwnerLabel="Demo User"
        onClose={onClose}
        onConfirm={vi.fn()}
        labels={dialogLabels}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultTasksLabels.cancel }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskListDot } from "@/tasks-core/src/tasks-list-dot";
import { INBOX_TASK_LIST_ID } from "@/tasks-core/src/tasks-task-utils";

describe("TaskListDot", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders inbox icon for inbox list id", () => {
    const { container } = render(<TaskListDot list={INBOX_TASK_LIST_ID} />);
    expect(container.querySelector(".tasks-list-inbox-icon")).toBeTruthy();
    expect(container.querySelector(".tasks-list-dot")).toBeNull();
  });

  it("renders inbox icon for inbox list object", () => {
    const { container } = render(
      <TaskListDot list={{ id: "tl-inbox-uuid", role: "inbox", name: "Inbox" }} />,
    );
    expect(container.querySelector(".tasks-list-inbox-icon")).toBeTruthy();
    expect(container.querySelector(".tasks-list-dot")).toBeNull();
  });

  it("renders colored dot for non-inbox lists", () => {
    const { container } = render(<TaskListDot list={{ id: "work", color: "#ff0000" }} />);
    const dot = container.querySelector(".tasks-list-dot") as HTMLSpanElement | null;
    expect(dot).toBeTruthy();
    expect(dot?.style.backgroundColor).toBe("rgb(255, 0, 0)");
    expect(container.querySelector(".tasks-list-inbox-icon")).toBeNull();
  });
});

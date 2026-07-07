import { describe, expect, it } from "vitest";
import { defaultTaskListId, INBOX_TASK_LIST_ID, taskListDotColor } from "./tasks-task-utils";

describe("tasks-task-utils", () => {
  it("defaultTaskListId prefers inbox over other lists", () => {
    expect(
      defaultTaskListId([
        { id: "work", name: "Work", isDefault: false },
        { id: INBOX_TASK_LIST_ID, role: "inbox", name: "Inbox", isDefault: true },
      ]),
    ).toBe(INBOX_TASK_LIST_ID);
  });

  it("defaultTaskListId falls back to isDefault then first list", () => {
    expect(
      defaultTaskListId([
        { id: "work", isDefault: false },
        { id: "personal", isDefault: true },
      ]),
    ).toBe("personal");
    expect(defaultTaskListId([{ id: "work", isDefault: false }])).toBe("work");
    expect(defaultTaskListId([])).toBe(INBOX_TASK_LIST_ID);
  });

  it("taskListDotColor prefers explicit list color over hash fallback", () => {
    expect(taskListDotColor({ id: "work", color: "#ff0000" })).toBe("#ff0000");
    expect(taskListDotColor({ id: "work", color: "  #22c55e  " })).toBe("#22c55e");
  });

  it("taskListDotColor falls back to deterministic hash from list id", () => {
    expect(taskListDotColor("work")).toBe(taskListDotColor({ id: "work", color: null }));
    expect(taskListDotColor({ id: "work" })).toBe(taskListDotColor("work"));
  });
});

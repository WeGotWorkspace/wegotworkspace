import { describe, expect, it } from "vitest";
import {
  defaultTaskListId,
  filterTasksByView,
  INBOX_TASK_LIST_ID,
  taskListDotColor,
} from "./tasks-task-utils";
import type { Task } from "./tasks-types";

const sampleTasks: Task[] = [
  {
    "@type": "Task",
    id: "t1",
    taskListId: "default",
    uid: "u1",
    title: "High priority",
    priority: 1,
    isDraft: false,
    sortOrder: 0,
    categories: [],
  },
  {
    "@type": "Task",
    id: "t2",
    taskListId: "default",
    uid: "u2",
    title: "Medium priority",
    priority: 5,
    isDraft: false,
    sortOrder: 1,
    categories: [],
  },
  {
    "@type": "Task",
    id: "t3",
    taskListId: "default",
    uid: "u3",
    title: "No priority",
    priority: null,
    isDraft: false,
    sortOrder: 2,
    categories: [],
  },
];

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

  it("filterTasksByView filters by priority slug", () => {
    expect(filterTasksByView(sampleTasks, "priority:high").map((task) => task.id)).toEqual(["t1"]);
    expect(filterTasksByView(sampleTasks, "priority:medium").map((task) => task.id)).toEqual([
      "t2",
    ]);
    expect(filterTasksByView(sampleTasks, "priority:low")).toEqual([]);
  });
});

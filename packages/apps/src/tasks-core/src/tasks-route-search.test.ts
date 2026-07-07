import { describe, expect, it } from "vitest";
import {
  normalizeTasksView,
  tasksNavigateTarget,
  tasksViewFromLocation,
} from "@/tasks-core/src/tasks-route-search";
import { INBOX_TASK_LIST_ID } from "@/tasks-core/src/tasks-task-utils";

describe("tasks-route-search", () => {
  it("maps state, tag, and list paths to controller view keys", () => {
    expect(tasksViewFromLocation("/tasks/state/all", {})).toBe("state:all");
    expect(tasksViewFromLocation("/tasks/state/today", { stateSlug: "today" })).toBe("state:today");
    expect(
      tasksViewFromLocation("/tasks/tags/focus", {
        tagSlug: "focus",
      }),
    ).toBe("tag:focus");
    expect(
      tasksViewFromLocation("/tasks/lists/work", {
        listId: "work",
      }),
    ).toBe("list:work");
  });

  it("prefers pathname slugs when route params are not yet available", () => {
    expect(tasksViewFromLocation("/tasks/state/all", {})).toBe("state:all");
    expect(tasksViewFromLocation("/tasks/lists/inbox", {})).toBe("list:inbox");
    expect(tasksViewFromLocation("/tasks/tags/My%20Tag", {})).toBe("tag:My Tag");
  });

  it("builds navigation targets from controller view state", () => {
    expect(tasksNavigateTarget("state:all")).toEqual({ to: "/tasks/state/all", params: {} });
    expect(tasksNavigateTarget("state:today")).toEqual({
      to: "/tasks/state/$stateSlug",
      params: { stateSlug: "today" },
    });
    expect(tasksNavigateTarget("tag:work")).toEqual({
      to: "/tasks/tags/$tagSlug",
      params: { tagSlug: "work" },
    });
    expect(tasksNavigateTarget("list:personal")).toEqual({
      to: "/tasks/lists/$listId",
      params: { listId: "personal" },
    });
  });

  it("normalizes inbox aliases to the canonical list id from bootstrap", () => {
    const taskLists = [
      { id: "tl-inbox-uuid", role: "inbox", name: "Inbox" },
      { id: "work", name: "Work" },
    ];

    expect(normalizeTasksView(`list:${INBOX_TASK_LIST_ID}`, taskLists)).toBe("list:tl-inbox-uuid");
    expect(normalizeTasksView("list:tl-inbox-uuid", taskLists)).toBe("list:tl-inbox-uuid");
    expect(normalizeTasksView("list:work", taskLists)).toBe("list:work");
    expect(normalizeTasksView("state:today", taskLists)).toBe("state:today");
  });
});

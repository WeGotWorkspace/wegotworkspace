import { describe, expect, it } from "vitest";
import {
  applyUpdaterToIds,
  collectSnapshotValues,
  nextActiveIdAfterRemoving,
  removeItemsByIds,
  restoreItemsFromSnapshot,
  snapshotItemsById,
} from "@/hooks/collection-controller-utils";

type Item = { id: string; label: string };

const items: Item[] = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Bravo" },
  { id: "c", label: "Charlie" },
];

describe("nextActiveIdAfterRemoving", () => {
  it("returns same id when active item is not removed", () => {
    expect(nextActiveIdAfterRemoving(["a", "b", "c"], ["x"], "b")).toBe("b");
  });

  it("selects same index in remaining list when possible", () => {
    expect(nextActiveIdAfterRemoving(["a", "b", "c"], ["b"], "b")).toBe("c");
  });

  it("falls back to first remaining id when active id is absent from visible list", () => {
    expect(nextActiveIdAfterRemoving(["a", "b"], ["b", "c"], "c")).toBe("a");
    expect(nextActiveIdAfterRemoving(["a", "b"], ["a", "b"], "a")).toBe("");
  });
});

describe("snapshotItemsById", () => {
  it("captures only requested ids", () => {
    const snapshot = snapshotItemsById(items, ["a", "c"]);
    expect([...snapshot.keys()]).toEqual(["a", "c"]);
    expect(snapshot.get("a")?.label).toBe("Alpha");
  });
});

describe("applyUpdaterToIds", () => {
  it("updates only targeted ids", () => {
    const updated = applyUpdaterToIds(items, ["b"], (item) => ({ ...item, label: "Updated" }));
    expect(updated.find((item) => item.id === "b")?.label).toBe("Updated");
    expect(updated.find((item) => item.id === "a")?.label).toBe("Alpha");
  });
});

describe("restoreItemsFromSnapshot", () => {
  it("restores items present in snapshot map", () => {
    const snapshot = snapshotItemsById(items, ["b"]);
    const changed = applyUpdaterToIds(items, ["b"], (item) => ({ ...item, label: "Changed" }));
    const restored = restoreItemsFromSnapshot(changed, snapshot);
    expect(restored.find((item) => item.id === "b")?.label).toBe("Bravo");
  });
});

describe("removeItemsByIds", () => {
  it("filters out removed ids and no-ops on empty input", () => {
    expect(removeItemsByIds(items, ["b"]).map((item) => item.id)).toEqual(["a", "c"]);
    expect(removeItemsByIds(items, [])).toBe(items);
  });
});

describe("collectSnapshotValues", () => {
  it("collects picked values from snapshot entries", () => {
    const snapshot = snapshotItemsById(items, ["a", "c"]);
    expect([...collectSnapshotValues(snapshot, (item) => item.label)]).toEqual([
      "Alpha",
      "Charlie",
    ]);
  });
});

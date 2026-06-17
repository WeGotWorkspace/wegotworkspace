import { describe, expect, it, vi } from "vitest";
import {
  reportContactsSyncConflicts,
  setContactsSyncConflictListener,
} from "@/lib/offline/contacts-sync-conflicts";

describe("contacts sync conflicts", () => {
  it("notifies the registered listener with card ids", () => {
    const listener = vi.fn();
    setContactsSyncConflictListener(listener);
    reportContactsSyncConflicts(["jane-doe"]);
    expect(listener).toHaveBeenCalledWith(["jane-doe"]);
    setContactsSyncConflictListener(undefined);
  });

  it("ignores empty conflict lists", () => {
    const listener = vi.fn();
    setContactsSyncConflictListener(listener);
    reportContactsSyncConflicts([]);
    expect(listener).not.toHaveBeenCalled();
    setContactsSyncConflictListener(undefined);
  });
});

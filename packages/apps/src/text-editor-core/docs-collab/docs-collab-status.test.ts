import { describe, expect, it } from "vitest";
import {
  DOC_STATUS_LOADED_SHARED_DOCUMENT,
  DOC_STATUS_RESTORED_WORKING_VERSION,
  formatSavedDocStatus,
  isTransientDocStatus,
} from "./docs-collab-status";

describe("isTransientDocStatus", () => {
  it("treats one-off confirmations as transient", () => {
    expect(isTransientDocStatus(DOC_STATUS_LOADED_SHARED_DOCUMENT)).toBe(true);
    expect(isTransientDocStatus(DOC_STATUS_RESTORED_WORKING_VERSION)).toBe(true);
    expect(isTransientDocStatus(formatSavedDocStatus(new Date("2026-01-01T10:00:00")))).toBe(true);
  });

  it("treats connection and sync states as persistent", () => {
    expect(isTransientDocStatus("Connecting to collaborators…")).toBe(false);
    expect(isTransientDocStatus("Reconnecting…")).toBe(false);
    expect(isTransientDocStatus("Editing offline")).toBe(false);
    expect(isTransientDocStatus("Server unavailable, using local draft")).toBe(false);
  });

  it("treats errors and empty status as persistent", () => {
    expect(isTransientDocStatus("Save failed: network down")).toBe(false);
    expect(isTransientDocStatus("")).toBe(false);
  });
});

describe("formatSavedDocStatus", () => {
  it("renders a transient saved confirmation with a timestamp", () => {
    const status = formatSavedDocStatus(new Date("2026-01-01T10:00:00"));
    expect(status.startsWith("Saved · ")).toBe(true);
    expect(isTransientDocStatus(status)).toBe(true);
  });
});

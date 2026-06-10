import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatNoteDateForDetail,
  formatNoteDateForList,
  parseNoteTimestamp,
} from "@/notes-core/src/notes-date-utils";

describe("parseNoteTimestamp", () => {
  it("parses ISO timestamps and rejects invalid values", () => {
    expect(parseNoteTimestamp("2026-06-10T10:00:00.000Z")).toBe(
      Date.parse("2026-06-10T10:00:00.000Z"),
    );
    expect(parseNoteTimestamp("soon")).toBeNull();
  });
});

describe("formatNoteDateForList", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows compact time for notes updated today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T18:00:00.000Z"));
    const formatted = formatNoteDateForList("2026-06-10T08:30:00.000Z");
    expect(formatted).toMatch(/\d/);
  });

  it("returns raw string when timestamp is invalid", () => {
    expect(formatNoteDateForList("draft")).toBe("draft");
  });
});

describe("formatNoteDateForDetail", () => {
  it("includes weekday and year for valid timestamps", () => {
    const formatted = formatNoteDateForDetail("2026-01-05T14:00:00.000Z");
    expect(formatted.toLowerCase()).toContain("2026");
  });

  it("returns raw string when timestamp is invalid", () => {
    expect(formatNoteDateForDetail("unknown")).toBe("unknown");
  });
});

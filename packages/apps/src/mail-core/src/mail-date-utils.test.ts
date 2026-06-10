import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compareMailDesc,
  formatMailDateForDetail,
  formatMailDateForList,
  parseMailTimestamp,
} from "@/mail-core/src/mail-date-utils";
import type { Mail } from "@/types/mail";

function mail(partial: Partial<Mail> & Pick<Mail, "id" | "uid">): Mail {
  return {
    folder: "inbox",
    from: "Alice",
    email: "alice@example.com",
    mailbox: "Inbox",
    unread: false,
    starred: false,
    notebook: "Alice",
    category: "Inbox",
    date: "",
    title: "",
    excerpt: "",
    body: [],
    detailLoaded: false,
    tags: [],
    wordCount: 0,
    ...partial,
  };
}

describe("parseMailTimestamp", () => {
  it("parses ISO timestamps and rejects invalid values", () => {
    expect(parseMailTimestamp("2026-06-10T10:00:00.000Z")).toBe(
      Date.parse("2026-06-10T10:00:00.000Z"),
    );
    expect(parseMailTimestamp("not-a-date")).toBeNull();
  });
});

describe("compareMailDesc", () => {
  it("sorts newest first by date then uid then id", () => {
    const newer = mail({ id: "a", uid: 1, date: "2026-06-10T12:00:00.000Z" });
    const older = mail({ id: "b", uid: 2, date: "2026-06-09T12:00:00.000Z" });
    expect(compareMailDesc(newer, older)).toBeLessThan(0);

    const sameDateA = mail({ id: "a", uid: 5, date: "2026-06-10T12:00:00.000Z" });
    const sameDateB = mail({ id: "b", uid: 3, date: "2026-06-10T12:00:00.000Z" });
    expect(compareMailDesc(sameDateA, sameDateB)).toBeLessThan(0);
  });

  it("prefers rows with valid dates over invalid ones", () => {
    const valid = mail({ id: "a", uid: 1, date: "2026-06-10T12:00:00.000Z" });
    const invalid = mail({ id: "b", uid: 99, date: "unknown" });
    expect(compareMailDesc(valid, invalid)).toBeLessThan(0);
  });
});

describe("formatMailDateForList", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows time-only for messages from today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T15:30:00.000Z"));
    const formatted = formatMailDateForList("2026-06-10T09:15:00.000Z");
    expect(formatted).toMatch(/\d/);
    expect(formatted.length).toBeLessThan(12);
  });

  it("returns raw string when timestamp is invalid", () => {
    expect(formatMailDateForList("Yesterday-ish")).toBe("Yesterday-ish");
  });
});

describe("formatMailDateForDetail", () => {
  it("includes weekday and full date for valid timestamps", () => {
    const formatted = formatMailDateForDetail("2026-06-10T09:15:00.000Z");
    expect(formatted.toLowerCase()).toContain("2026");
  });

  it("returns raw string when timestamp is invalid", () => {
    expect(formatMailDateForDetail("TBD")).toBe("TBD");
  });
});

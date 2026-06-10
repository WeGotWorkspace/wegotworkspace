import { describe, expect, it } from "vitest";
import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import {
  formatByteCount,
  formatHumanDateTime,
  getServerCheckVisual,
  isProtectedGroup,
  parseUpdateLogLine,
} from "@/admin-core/src/admin-workspace-utils";

describe("getServerCheckVisual", () => {
  it("maps error statuses to failure visuals", () => {
    expect(getServerCheckVisual({ ok: false, status: "error" })).toEqual({
      Icon: CircleX,
      color: "#b14242",
    });
  });

  it("maps warnings and unknown detail to warning visuals", () => {
    expect(getServerCheckVisual({ ok: true, status: "warn" })).toEqual({
      Icon: AlertTriangle,
      color: "#c98a1f",
    });
    expect(getServerCheckVisual({ ok: true, detail: "unknown provider" })).toEqual({
      Icon: AlertTriangle,
      color: "#c98a1f",
    });
  });

  it("maps healthy checks to success visuals", () => {
    expect(getServerCheckVisual({ ok: true, status: "ok" })).toEqual({
      Icon: CheckCircle2,
      color: "#3a8f5a",
    });
  });
});

describe("parseUpdateLogLine", () => {
  it("parses timestamped lines with level", () => {
    expect(parseUpdateLogLine("[2026-06-10 12:00:00] [ERROR] Disk full", 1)).toEqual({
      id: "1",
      date: "2026-06-10 12:00:00",
      level: "ERROR",
      message: "Disk full",
    });
  });

  it("parses timestamp-only lines as INFO", () => {
    expect(parseUpdateLogLine("[2026-06-10 12:00:00] Starting update", 2)).toEqual({
      id: "2",
      date: "2026-06-10 12:00:00",
      level: "INFO",
      message: "Starting update",
    });
  });

  it("returns plain text lines unchanged", () => {
    expect(parseUpdateLogLine("No timestamp here", 3)).toEqual({
      id: "3",
      date: null,
      level: "INFO",
      message: "No timestamp here",
    });
  });
});

describe("formatHumanDateTime", () => {
  it("formats valid timestamps and handles empty input", () => {
    expect(formatHumanDateTime(null)).toBe("-");
    expect(formatHumanDateTime("2026-06-10T10:00:00.000Z")).toMatch(/2026/);
    expect(formatHumanDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatByteCount", () => {
  it("formats byte counts with scaling units", () => {
    expect(formatByteCount(0)).toBe("0 B");
    expect(formatByteCount(1536)).toBe("1.5 KB");
    expect(formatByteCount(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("isProtectedGroup", () => {
  it("flags administrators group as protected", () => {
    expect(isProtectedGroup("principals/groups/administrators")).toBe(true);
    expect(isProtectedGroup("principals/groups/users")).toBe(false);
  });
});

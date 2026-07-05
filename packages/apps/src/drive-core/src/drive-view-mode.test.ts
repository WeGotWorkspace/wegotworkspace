import { describe, expect, it } from "vitest";
import { parseDriveViewMode } from "@/drive-core/src/drive-view-mode";

describe("parseDriveViewMode", () => {
  it("accepts grid, list, and column", () => {
    expect(parseDriveViewMode("grid", "list")).toBe("grid");
    expect(parseDriveViewMode("list", "grid")).toBe("list");
    expect(parseDriveViewMode("column", "grid")).toBe("column");
  });

  it("falls back for unknown values", () => {
    expect(parseDriveViewMode("table", "grid")).toBe("grid");
    expect(parseDriveViewMode(null, "column")).toBe("column");
  });
});

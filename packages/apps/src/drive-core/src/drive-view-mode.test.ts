import { describe, expect, it } from "vitest";
import { parseDriveViewMode } from "@/drive-core/src/drive-view-mode";

describe("parseDriveViewMode", () => {
  it("accepts grid and list", () => {
    expect(parseDriveViewMode("grid", "list")).toBe("grid");
    expect(parseDriveViewMode("list", "grid")).toBe("list");
  });

  it("falls back for removed or unknown values", () => {
    expect(parseDriveViewMode("column", "grid")).toBe("grid");
    expect(parseDriveViewMode("table", "grid")).toBe("grid");
    expect(parseDriveViewMode(null, "list")).toBe("list");
  });
});

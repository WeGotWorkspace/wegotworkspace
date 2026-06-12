import { describe, expect, it } from "vitest";
import { resolveDriveFolderPickerStartPath } from "@/drive-core/src/drive-folder-picker-utils";

describe("resolveDriveFolderPickerStartPath", () => {
  it("opens at the current folder when not in trash", () => {
    expect(resolveDriveFolderPickerStartPath({ type: "folder", path: "My Drive/Assets" })).toBe(
      "My Drive/Assets",
    );
  });

  it("falls back to single item parent outside trash", () => {
    expect(resolveDriveFolderPickerStartPath({ type: "recent" }, "My Drive/Projects")).toBe(
      "My Drive/Projects",
    );
  });

  it("defaults to My Drive for trash and virtual views without parent", () => {
    expect(resolveDriveFolderPickerStartPath({ type: "folder", path: "Trash" })).toBe("My Drive");
    expect(resolveDriveFolderPickerStartPath({ type: "starred" })).toBe("My Drive");
    expect(resolveDriveFolderPickerStartPath({ type: "recent" }, "Trash/Old")).toBe("My Drive");
  });
});

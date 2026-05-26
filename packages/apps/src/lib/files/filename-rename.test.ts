import { describe, expect, it } from "vitest";
import { joinFileNameForRename, splitFileNameForRename } from "@/lib/files/filename-rename";

describe("splitFileNameForRename", () => {
  it("splits on the last dot", () => {
    expect(splitFileNameForRename("notes.md")).toEqual({
      baseName: "notes",
      extension: ".md",
      hasExtension: true,
    });
    expect(splitFileNameForRename("archive.tar.gz")).toEqual({
      baseName: "archive.tar",
      extension: ".gz",
      hasExtension: true,
    });
  });

  it("keeps dotfiles without a separate extension", () => {
    expect(splitFileNameForRename(".gitignore")).toEqual({
      baseName: ".gitignore",
      extension: "",
      hasExtension: false,
    });
  });

  it("treats names without a dot as extensionless", () => {
    expect(splitFileNameForRename("README")).toEqual({
      baseName: "README",
      extension: "",
      hasExtension: false,
    });
  });
});

describe("joinFileNameForRename", () => {
  it("recombines base and extension", () => {
    expect(joinFileNameForRename("notes", ".md")).toBe("notes.md");
    expect(joinFileNameForRename("notes", "")).toBe("notes");
  });
});

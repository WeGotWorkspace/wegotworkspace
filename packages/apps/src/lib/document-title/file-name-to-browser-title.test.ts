import { describe, expect, it } from "vitest";
import { fileNameToBrowserTitle } from "@/lib/document-title/file-name-to-browser-title";

describe("fileNameToBrowserTitle", () => {
  it("strips the last extension segment", () => {
    expect(fileNameToBrowserTitle("notes.md")).toBe("notes");
    expect(fileNameToBrowserTitle("archive.tar.gz")).toBe("archive.tar");
  });

  it("returns the trimmed name when there is no extension", () => {
    expect(fileNameToBrowserTitle("README")).toBe("README");
    expect(fileNameToBrowserTitle(".gitignore")).toBe(".gitignore");
  });

  it("returns empty for blank input", () => {
    expect(fileNameToBrowserTitle("")).toBe("");
    expect(fileNameToBrowserTitle("   ")).toBe("");
  });
});

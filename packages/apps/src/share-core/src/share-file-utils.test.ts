import { describe, expect, it } from "vitest";
import type { WgwDriveDirectoryEntry } from "@/lib/api/wgw/types";
import {
  joinSharePath,
  normalizeSharePath,
  shareBreadcrumbs,
  shareFileFromEntry,
} from "@/share-core/src/share-file-utils";

describe("normalizeSharePath", () => {
  it("strips slashes and dot segments", () => {
    expect(normalizeSharePath("/a/b/")).toBe("a/b");
    expect(normalizeSharePath("a//b/./c")).toBe("a/b/c");
    expect(normalizeSharePath("")).toBe("");
    expect(normalizeSharePath("/")).toBe("");
  });
});

describe("joinSharePath", () => {
  it("joins relative parents with a child name", () => {
    expect(joinSharePath("", "file.txt")).toBe("file.txt");
    expect(joinSharePath("docs", "file.txt")).toBe("docs/file.txt");
    expect(joinSharePath("/docs/", "sub")).toBe("docs/sub");
  });
});

describe("shareFileFromEntry", () => {
  it("maps a directory entry", () => {
    const entry: WgwDriveDirectoryEntry = {
      type: "dir",
      path: "/photos",
      name: "photos",
      size: 0,
      time: 0,
      permissions: 0,
    };
    const file = shareFileFromEntry(entry);
    expect(file).toMatchObject({ kind: "folder", title: "photos", apiPath: "photos", size: "—" });
  });

  it("maps a file entry and infers its kind and size", () => {
    const entry: WgwDriveDirectoryEntry = {
      type: "file",
      path: "photos/cat.png",
      name: "cat.png",
      size: 2048,
      time: 1_700_000_000,
      permissions: 0,
    };
    const file = shareFileFromEntry(entry);
    expect(file.kind).toBe("image");
    expect(file.apiPath).toBe("photos/cat.png");
    expect(file.size).toBe("2.0 KB");
  });
});

describe("shareBreadcrumbs", () => {
  it("builds an accumulating trail from the root", () => {
    expect(shareBreadcrumbs("Shared folder", "a/b")).toEqual([
      { label: "Shared folder", path: "" },
      { label: "a", path: "a" },
      { label: "b", path: "a/b" },
    ]);
  });

  it("returns only the root for an empty path", () => {
    expect(shareBreadcrumbs("Root", "")).toEqual([{ label: "Root", path: "" }]);
  });
});

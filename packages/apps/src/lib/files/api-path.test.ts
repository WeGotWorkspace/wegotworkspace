import { describe, expect, it } from "vitest";
import {
  normalizeApiVirtualPath,
  parentAndName,
  pathFromDirectoryEntry,
} from "@/lib/files/api-path";

describe("normalizeApiVirtualPath", () => {
  it("adds a leading slash and strips trailing slashes", () => {
    expect(normalizeApiVirtualPath("users/alice/docs/")).toBe("/users/alice/docs");
    expect(normalizeApiVirtualPath("/users/alice/docs/")).toBe("/users/alice/docs");
  });

  it("returns root for empty input", () => {
    expect(normalizeApiVirtualPath("")).toBe("/");
    expect(normalizeApiVirtualPath("/")).toBe("/");
  });
});

describe("parentAndName", () => {
  it("splits nested virtual paths", () => {
    expect(parentAndName("/users/alice/report.pdf")).toEqual({
      destination: "/users/alice",
      from: "report.pdf",
    });
  });

  it("returns root destination for top-level names", () => {
    expect(parentAndName("/readme.txt")).toEqual({
      destination: "/",
      from: "readme.txt",
    });
  });
});

describe("pathFromDirectoryEntry", () => {
  it("normalizes directory entry paths", () => {
    expect(pathFromDirectoryEntry({ path: "users/alice/archive/" })).toBe("/users/alice/archive");
  });
});

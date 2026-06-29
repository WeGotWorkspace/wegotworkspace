import { describe, expect, it, vi } from "vitest";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import {
  buildDocsHomeDrives,
  collectGroupRoots,
  fallbackUntitledMarkdownName,
  mergeGroupRoots,
  newDocumentApiPath,
  nextUntitledMarkdownName,
  resolveDocsHomeCreateDialogBrowsePath,
  resolveNewDocumentName,
} from "@/docs-core/src/docs-home-drives";

function file(partial: Partial<DriveFile> & { id: string }): DriveFile {
  return {
    category: "document",
    date: "Now",
    title: partial.title ?? partial.id,
    excerpt: "",
    body: [],
    notebook: "",
    tags: [],
    wordCount: 0,
    parent: "My Drive",
    kind: "doc",
    size: "—",
    ...partial,
  };
}

describe("collectGroupRoots", () => {
  it("extracts sorted, unique group roots from /groups/{root} api paths", () => {
    const files = [
      file({ id: "1", apiPath: "/users/alice/a.md" }),
      file({ id: "2", apiPath: "/groups/engineering/rfc.md" }),
      file({ id: "3", apiPath: "/groups/design/brand.md" }),
      file({ id: "4", apiPath: "/groups/engineering/onboarding.md" }),
      file({ id: "5" }),
    ];
    expect(collectGroupRoots(files)).toEqual(["design", "engineering"]);
  });

  it("returns an empty list when no group files are present", () => {
    expect(collectGroupRoots([file({ id: "1", apiPath: "/users/alice/a.md" })])).toEqual([]);
  });
});

describe("mergeGroupRoots", () => {
  it("unions and sorts without dropping previously discovered roots", () => {
    expect(mergeGroupRoots(["engineering"], ["design", "engineering"])).toEqual([
      "design",
      "engineering",
    ]);
  });
});

describe("buildDocsHomeDrives", () => {
  it("lists My Drive first, then each group drive", () => {
    const drives = buildDocsHomeDrives("alice", ["engineering", "design"], "My Drive");
    expect(drives).toEqual([
      { key: "users/alice", label: "My Drive", pathPrefix: "users/alice" },
      { key: "groups/engineering", label: "engineering", pathPrefix: "groups/engineering" },
      { key: "groups/design", label: "design", pathPrefix: "groups/design" },
    ]);
  });

  it("omits My Drive when the username is blank", () => {
    expect(buildDocsHomeDrives("  ", ["eng"], "My Drive")).toEqual([
      { key: "groups/eng", label: "eng", pathPrefix: "groups/eng" },
    ]);
  });
});

describe("newDocumentApiPath", () => {
  it("builds a unique Untitled path under the user's drive", () => {
    expect(newDocumentApiPath("alice", [])).toBe("/users/alice/Untitled.md");
  });

  it("avoids collisions with existing loaded files", () => {
    const files = [
      file({ id: "1", title: "Untitled.md" }),
      file({ id: "2", title: "Untitled 2.md" }),
    ];
    expect(newDocumentApiPath("alice", files)).toBe("/users/alice/Untitled 3.md");
  });

  it("returns null when the username is blank", () => {
    expect(newDocumentApiPath("", [])).toBeNull();
  });
});

function listingOperations(names: string[]): DriveAPIOperations {
  const state = {
    directory: { files: names.map((name) => ({ name })) },
  } as unknown as DriveUIData;
  return { listDirectory: vi.fn(async () => state) } as unknown as DriveAPIOperations;
}

describe("nextUntitledMarkdownName", () => {
  it("returns Untitled.md when nothing collides", () => {
    expect(nextUntitledMarkdownName([])).toBe("Untitled.md");
  });

  it("increments to the first free suffix, case-insensitively", () => {
    expect(nextUntitledMarkdownName(["untitled.md", "Untitled 2.md"])).toBe("Untitled 3.md");
  });
});

describe("fallbackUntitledMarkdownName", () => {
  it("builds a filesystem-safe timestamped name", () => {
    expect(fallbackUntitledMarkdownName(new Date("2026-06-19T10:12:30.000Z"))).toBe(
      "Untitled 2026-06-19 10-12-30.md",
    );
  });
});

describe("resolveNewDocumentName", () => {
  it("uses the live directory listing and never overwrites an existing file", async () => {
    const operations = listingOperations(["Untitled.md", "Roadmap.md"]);
    await expect(resolveNewDocumentName(operations, "/users/alice", [])).resolves.toBe(
      "Untitled 2.md",
    );
    expect(operations.listDirectory).toHaveBeenCalledWith("/users/alice");
  });

  it("falls back to a timestamped name when the listing fails", async () => {
    const operations = {
      listDirectory: vi.fn(async () => {
        throw new Error("offline");
      }),
    } as unknown as DriveAPIOperations;
    const name = await resolveNewDocumentName(operations, "/users/alice", [
      file({ id: "1", title: "Untitled.md" }),
    ]);
    expect(name).not.toBe("Untitled.md");
    expect(name).toMatch(/^Untitled .+\.md$/);
  });

  it("derives from loaded files when no live operations are available", async () => {
    const files = [file({ id: "1", title: "Untitled.md" })];
    await expect(resolveNewDocumentName(undefined, "/users/alice", files)).resolves.toBe(
      "Untitled 2.md",
    );
  });
});

describe("resolveDocsHomeCreateDialogBrowsePath", () => {
  it("maps the selected drive prefix to a folder picker path", () => {
    expect(resolveDocsHomeCreateDialogBrowsePath(null)).toBe("My Drive");
    expect(resolveDocsHomeCreateDialogBrowsePath("users/alice")).toBe("My Drive");
    expect(resolveDocsHomeCreateDialogBrowsePath("groups/engineering")).toBe("Groups/engineering");
  });
});

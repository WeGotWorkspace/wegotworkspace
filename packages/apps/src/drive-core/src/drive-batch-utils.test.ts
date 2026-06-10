import { describe, expect, it } from "vitest";
import {
  mergeDriveFolderListing,
  resolveDriveFileApiPath,
} from "@/drive-core/src/drive-batch-utils";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveUIData } from "@/drive-core/src/drive-types";

const USER = "alice";
const groupRoots = new Set<string>();
const EMPTY_DRIVE_UI: DriveUIData = {
  user: { username: USER, name: USER, role: "user", roots: ["/users"] },
  cwd: "",
  directory: { location: "", files: [] },
  plugins: [],
};

function driveFile(
  partial: Partial<DriveFile> & Pick<DriveFile, "id" | "title" | "parent">,
): DriveFile {
  return {
    notebook: "",
    category: "",
    date: "",
    excerpt: "",
    body: [],
    tags: [],
    wordCount: 0,
    kind: "file",
    size: "1 KB",
    ...partial,
  };
}

describe("resolveDriveFileApiPath", () => {
  it("uses explicit apiPath when present", () => {
    const file = driveFile({
      id: "1",
      title: "doc.pdf",
      parent: "My Drive",
      apiPath: "/users/alice/doc.pdf",
    });
    expect(resolveDriveFileApiPath(file, USER, groupRoots)).toBe("/users/alice/doc.pdf");
  });

  it("derives api path from parent UI path and title", () => {
    const file = driveFile({ id: "2", title: "notes.md", parent: "My Drive/Projects" });
    expect(resolveDriveFileApiPath(file, USER, groupRoots)).toBe("/users/alice/Projects/notes.md");
  });
});

describe("mergeDriveFolderListing", () => {
  it("keeps optimistically staged files until server listing catches up", () => {
    const previous = [
      driveFile({
        id: "/users/alice/Projects/new.md",
        title: "new.md",
        parent: "My Drive/Projects",
      }),
      driveFile({
        id: "/users/alice/Projects/old.md",
        title: "old.md",
        parent: "My Drive/Projects",
      }),
    ];
    const nextData = {
      cwd: "/users/alice/Projects",
      directory: {
        location: "/users/alice/Projects",
        files: [
          {
            name: "old.md",
            path: "/users/alice/Projects/old.md",
            type: "file",
            size: 100,
            time: 1,
            permissions: 644,
          },
        ],
      },
    } as DriveUIData;
    const merged = mergeDriveFolderListing(previous, nextData, USER);
    expect(merged.map((file) => file.title)).toEqual(["old.md", "new.md"]);
  });

  it("does not retain staged files from other folders", () => {
    const previous = [
      driveFile({ id: "/users/alice/Inbox/new.md", title: "new.md", parent: "My Drive/Inbox" }),
    ];
    const nextData: DriveUIData = {
      ...EMPTY_DRIVE_UI,
      cwd: "/users/alice/Projects",
      directory: { location: "/users/alice/Projects", files: [] },
    };
    expect(mergeDriveFolderListing(previous, nextData, USER)).toEqual([]);
  });
});

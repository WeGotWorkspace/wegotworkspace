import { describe, expect, it } from "vitest";
import { noteCollabPath } from "@/notes-core/src/note-collab-path";

describe("noteCollabPath", () => {
  it("maps a personal note to users/{username}/.notes/{notebook}/{id}.md", () => {
    expect(
      noteCollabPath({
        scope: { kind: "personal", username: "alice" },
        notebook: "Drafts",
        noteId: "note-1",
      }),
    ).toBe("users/alice/.notes/Drafts/note-1.md");
  });

  it("maps a shared group note to groups/{slug}/.notes/{notebook}/{id}.md", () => {
    expect(
      noteCollabPath({
        scope: { kind: "group", slug: "design" },
        notebook: "Specs",
        noteId: "n42",
      }),
    ).toBe("groups/design/.notes/Specs/n42.md");
  });

  it("routes archived notes under the .archive subtree", () => {
    expect(
      noteCollabPath({
        scope: { kind: "personal", username: "alice" },
        notebook: "Drafts",
        noteId: "note-1",
        archived: true,
      }),
    ).toBe("users/alice/.notes/.archive/Drafts/note-1.md");
  });
});

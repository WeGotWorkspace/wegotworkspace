import { describe, expect, it } from "vitest";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import {
  createCollaborativeTextEditorExtensions,
  createTextEditorExtensions,
} from "./text-editor-extensions";

function duplicateExtensionNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) duplicates.add(name);
    else seen.add(name);
  }
  return [...duplicates];
}

describe("text editor extensions", () => {
  it("does not duplicate extension names in the base editor", () => {
    const extensions = createTextEditorExtensions({ format: "markdown" });
    const names = extensions.map((ext) => ext.name);
    expect(duplicateExtensionNames(names)).toEqual([]);
  });

  it("does not duplicate extension names in the collaborative editor", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const extensions = createCollaborativeTextEditorExtensions({
      document: ydoc,
      awareness,
      user: { name: "Alex", color: "#2563eb" },
      format: "markdown",
    });
    const names = extensions.map((ext) => ext.name);
    expect(duplicateExtensionNames(names)).toEqual([]);
  });

  it("excludes the pagination extension by default", () => {
    const names = createTextEditorExtensions({ format: "markdown" }).map((ext) => ext.name);
    expect(names).not.toContain("PaginationPlus");
  });

  it("includes the pagination extension when pagination is enabled", () => {
    const names = createTextEditorExtensions({ format: "markdown", pagination: true }).map(
      (ext) => ext.name,
    );
    expect(names).toContain("PaginationPlus");
    expect(duplicateExtensionNames(names)).toEqual([]);
  });

  it("threads pagination through the collaborative editor without duplicating extensions", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const names = createCollaborativeTextEditorExtensions({
      document: ydoc,
      awareness,
      user: { name: "Alex", color: "#2563eb" },
      format: "markdown",
      pagination: true,
    }).map((ext) => ext.name);
    expect(names).toContain("PaginationPlus");
    expect(duplicateExtensionNames(names)).toEqual([]);
  });
});

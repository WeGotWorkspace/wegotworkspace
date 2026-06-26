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
      user: { id: "alex", name: "Alex", color: "#2563eb" },
      format: "markdown",
    });
    const names = extensions.map((ext) => ext.name);
    expect(duplicateExtensionNames(names)).toEqual([]);
  });
});

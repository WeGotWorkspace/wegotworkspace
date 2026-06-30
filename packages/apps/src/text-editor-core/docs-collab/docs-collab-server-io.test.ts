import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { loadMarkdown, loadYjsSnapshot, saveDocument } from "./docs-collab-server-io";

describe("docs-collab-server-io", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loadMarkdown returns text on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("# Hello", { status: 200 })),
    );
    await expect(loadMarkdown("/doc")).resolves.toBe("# Hello");
  });

  it("loadMarkdown throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    await expect(loadMarkdown("/doc")).rejects.toThrow("Could not load document (404)");
  });

  it("loadYjsSnapshot returns false for 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const ydoc = new Y.Doc();
    await expect(loadYjsSnapshot("/yjs", ydoc)).resolves.toBe(false);
  });

  it("loadYjsSnapshot applies update on success", async () => {
    const source = new Y.Doc();
    source.getText("default").insert(0, "hi");
    const update = Y.encodeStateAsUpdate(source);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(update as unknown as BodyInit, { status: 200 })),
    );
    const target = new Y.Doc();
    await expect(loadYjsSnapshot("/yjs", target)).resolves.toBe(true);
    expect(target.getText("default").toString()).toBe("hi");
  });

  it("saveDocument throws parsed error message from body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "network down" }), { status: 503 })),
    );
    const ydoc = new Y.Doc();
    await expect(saveDocument("/doc", "# x", ydoc, undefined)).rejects.toThrow("network down");
  });

  it("saveDocument succeeds on ok response", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const ydoc = new Y.Doc();
    await saveDocument("/doc", "# x", ydoc, "docs/test.md", "token", "PUT");
    expect(fetchMock).toHaveBeenCalledWith(
      "/doc",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
  });
});

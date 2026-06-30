import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  canSeedFromFile,
  isLowestPeer,
  resolveBootstrapSeed,
  shouldApplyImmediateSeed,
  shouldDeferToMeshSeed,
  shouldSeedOffline,
} from "./docs-collab-seed";

describe("docs-collab-seed", () => {
  it("isLowestPeer picks lexicographically smallest id", () => {
    expect(isLowestPeer("peer-a", ["peer-b", "peer-c"])).toBe(true);
    expect(isLowestPeer("peer-z", ["peer-a"])).toBe(false);
  });

  it("resolveBootstrapSeed prefers server markdown over seedContent", () => {
    expect(resolveBootstrapSeed("# server", "# cached")).toBe("# server");
    expect(resolveBootstrapSeed("", "# cached")).toBe("# cached");
    expect(resolveBootstrapSeed("", undefined)).toBe("");
  });

  it("shouldSeedOffline when no mesh peers and seed content exists", () => {
    const ydoc = new Y.Doc();
    expect(shouldSeedOffline(null, ydoc, false, "# seed")).toBe(true);
    expect(shouldSeedOffline(null, ydoc, false, undefined)).toBe(false);
  });

  it("shouldDeferToMeshSeed when peers exist and doc empty", () => {
    const ydoc = new Y.Doc();
    const mesh = { getPeerIds: () => ["peer-b"], getMyId: () => "peer-a", linkCount: () => 1 };
    expect(shouldDeferToMeshSeed(mesh, ydoc, false)).toBe(true);
  });

  it("canSeedFromFile requires lowest peer with links", () => {
    const mesh = { getPeerIds: () => ["peer-b"], getMyId: () => "peer-a", linkCount: () => 1 };
    expect(canSeedFromFile(mesh, "peer-a", ["peer-b"])).toBe(true);
    expect(canSeedFromFile(mesh, "peer-z", ["peer-a"])).toBe(false);
    expect(canSeedFromFile(mesh, "peer-a", [])).toBe(true);
  });

  it("shouldApplyImmediateSeed when no mesh and seed present", () => {
    const ydoc = new Y.Doc();
    expect(shouldApplyImmediateSeed(null, ydoc, false, "# seed")).toBe(true);
    const mesh = { getPeerIds: () => ["peer-b"], getMyId: () => "peer-a", linkCount: () => 1 };
    expect(shouldApplyImmediateSeed(mesh, ydoc, false, "# seed")).toBe(false);
  });
});

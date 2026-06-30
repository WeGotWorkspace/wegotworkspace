import { describe, expect, it } from "vitest";
import * as awarenessProtocol from "y-protocols/awareness";
import * as Y from "yjs";
import { listAwarenessPresencePeers, mergeCollabPresencePeers } from "./docs-collab-presence-peers";

describe("docs-collab-presence-peers", () => {
  it("lists remote awareness users excluding the local client", () => {
    const awareness = new awarenessProtocol.Awareness(new Y.Doc());
    awareness.setLocalStateField("user", { name: "wouter", color: "#2563eb" });

    const remote = new awarenessProtocol.Awareness(new Y.Doc());
    remote.setLocalStateField("user", { name: "admin", color: "#dc2626" });
    const update = awarenessProtocol.encodeAwarenessUpdate(remote, [remote.clientID]);
    awarenessProtocol.applyAwarenessUpdate(awareness, update, "test");

    expect(listAwarenessPresencePeers(awareness)).toEqual([
      { id: String(remote.clientID), name: "admin" },
    ]);
  });

  it("preserves distinct identities for two-tab same-browser scenario", () => {
    const wouterAwareness = new awarenessProtocol.Awareness(new Y.Doc());
    wouterAwareness.setLocalStateField("user", { name: "wouter", color: "#2563eb" });

    const adminAwareness = new awarenessProtocol.Awareness(new Y.Doc());
    adminAwareness.setLocalStateField("user", { name: "admin", color: "#dc2626" });

    const adminToWouter = awarenessProtocol.encodeAwarenessUpdate(adminAwareness, [
      adminAwareness.clientID,
    ]);
    awarenessProtocol.applyAwarenessUpdate(wouterAwareness, adminToWouter, "bc-tab");

    const wouterToAdmin = awarenessProtocol.encodeAwarenessUpdate(wouterAwareness, [
      wouterAwareness.clientID,
    ]);
    awarenessProtocol.applyAwarenessUpdate(adminAwareness, wouterToAdmin, "bc-tab");

    expect(listAwarenessPresencePeers(wouterAwareness)).toEqual([
      { id: String(adminAwareness.clientID), name: "admin" },
    ]);
    expect(listAwarenessPresencePeers(adminAwareness)).toEqual([
      { id: String(wouterAwareness.clientID), name: "wouter" },
    ]);
  });

  it("merges awareness peers ahead of mesh peers and excludes local user", () => {
    const awarenessPeers = [{ id: "bc-admin", name: "admin" }];
    const meshPeers = [
      { id: "mesh-admin", name: "admin" },
      { id: "mesh-remote", name: "Remote" },
    ];

    expect(mergeCollabPresencePeers(awarenessPeers, meshPeers, "wouter")).toEqual([
      { id: "bc-admin", name: "admin" },
      { id: "mesh-remote", name: "Remote" },
    ]);
  });

  it("does not duplicate mesh peer when awareness already has the collaborator", () => {
    const merged = mergeCollabPresencePeers(
      [{ id: "1", name: "admin" }],
      [{ id: "2", name: "admin" }],
      "wouter",
    );
    expect(merged).toEqual([{ id: "1", name: "admin" }]);
  });
});

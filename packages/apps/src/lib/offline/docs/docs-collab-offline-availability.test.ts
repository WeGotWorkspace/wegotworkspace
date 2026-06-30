import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { hasDocsCollabOfflinePersistence } from "@/lib/offline/docs/docs-collab-offline-availability";

async function seedRoom(room: string): Promise<void> {
  const ydoc = new Y.Doc();
  ydoc.getXmlFragment("default").insert(0, [new Y.XmlElement("paragraph")]);
  const persistence = new IndexeddbPersistence(room, ydoc);
  await persistence.whenSynced;
  await persistence.destroy();
  ydoc.destroy();
}

describe("hasDocsCollabOfflinePersistence", () => {
  it("finds persistence stored under the normalized room key", async () => {
    await seedRoom("users/alice/offline-probe.md");

    await expect(hasDocsCollabOfflinePersistence(`/users/alice/offline-probe.md`)).resolves.toBe(
      true,
    );
    await expect(hasDocsCollabOfflinePersistence("users/alice/offline-probe.md")).resolves.toBe(
      true,
    );
  });

  it("still finds legacy persistence written with a leading slash room key", async () => {
    await seedRoom("/users/alice/legacy.md");

    await expect(hasDocsCollabOfflinePersistence("users/alice/legacy.md")).resolves.toBe(true);
  });
});

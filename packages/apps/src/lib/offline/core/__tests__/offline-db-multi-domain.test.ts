import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { registerOfflineDomainTables, WgwOfflineDatabase } from "@/lib/offline/core/offline-db";
import { contactsCardsTable } from "@/lib/offline/contacts/contacts-schema";
import {
  notesFixturePagesTable,
  NOTES_FIXTURE_DOMAIN,
  NOTES_FIXTURE_OFFLINE_VERSION,
} from "@/lib/offline/__tests__/fixtures/notes-offline-fixture";

const dbName = (key: string) => `wgw-offline-${key}`;

describe("offline db multi-domain registry", () => {
  it("opens fresh with core, contacts, and notes-fixture tables at the latest version", async () => {
    const db = new WgwOfflineDatabase("multi-fresh");
    await db.open();

    expect(db.verno).toBe(NOTES_FIXTURE_OFFLINE_VERSION.updatedAtIndex);
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      expect.arrayContaining([
        "contacts_address_books",
        "contacts_cards",
        "meta",
        "notes_fixture_notebooks",
        "notes_fixture_pages",
        "outbox",
      ]),
    );

    await db.delete();
  });

  it("keeps domain tables isolated while sharing one database", async () => {
    const db = new WgwOfflineDatabase("multi-isolated");
    await db.open();

    await contactsCardsTable(db).put({
      id: "contact-1",
      addressBookId: "default",
      data: '{"name":"Ada"}',
      pendingSync: false,
      updatedAt: 100,
    });
    await notesFixturePagesTable(db).put({
      id: "page-1",
      notebookId: "nb-1",
      body: "offline draft",
      updatedAt: 200,
    });
    await db.outbox.put({
      id: "contacts-op",
      domain: "contacts",
      op: "update",
      payload: "{}",
      createdAt: 1,
      retries: 0,
    });
    await db.outbox.put({
      id: "notes-op",
      domain: NOTES_FIXTURE_DOMAIN,
      op: "create",
      payload: "{}",
      createdAt: 2,
      retries: 0,
    });

    expect(await contactsCardsTable(db).count()).toBe(1);
    expect(await notesFixturePagesTable(db).count()).toBe(1);
    expect(await db.outbox.where("domain").equals("contacts").count()).toBe(1);
    expect(await db.outbox.where("domain").equals(NOTES_FIXTURE_DOMAIN).count()).toBe(1);

    await db.delete();
  });

  it("composes version steps from both domains when upgrading from core-only v1", async () => {
    const legacy = new Dexie(dbName("multi-upgrade"));
    legacy.version(1).stores({ meta: "key", outbox: "id, domain, createdAt" });
    await legacy.open();
    await legacy.table("meta").put({ key: "shared:session", value: "{}" });
    await legacy.table("outbox").put({
      id: "legacy-op",
      domain: "contacts",
      op: "update",
      payload: "{}",
      createdAt: 1,
      retries: 0,
    });
    legacy.close();

    const db = new WgwOfflineDatabase("multi-upgrade");
    await db.open();

    expect(db.verno).toBe(NOTES_FIXTURE_OFFLINE_VERSION.updatedAtIndex);
    expect(await db.meta.get("shared:session")).toBeTruthy();
    expect(await db.outbox.get("legacy-op")).toBeTruthy();
    expect(db.tables.map((t) => t.name)).toContain("contacts_cards");
    expect(db.tables.map((t) => t.name)).toContain("notes_fixture_pages");

    await db.delete();
  });

  it("runs the notes-fixture v10 -> v11 migration while contacts remains registered", async () => {
    const legacy = new Dexie(dbName("multi-migrate-notes"));
    legacy.version(1).stores({ meta: "key", outbox: "id, domain, createdAt" });
    legacy.version(2).stores({
      meta: "key",
      outbox: "id, domain, createdAt",
      contacts_address_books: "id",
      contacts_cards: "id, addressBookId, pendingSync",
    });
    legacy.version(3).stores({
      meta: "key",
      outbox: "id, domain, createdAt",
      contacts_address_books: "id",
      contacts_cards: "id, addressBookId, pendingSync, updatedAt",
    });
    legacy.version(NOTES_FIXTURE_OFFLINE_VERSION.tables).stores({
      meta: "key",
      outbox: "id, domain, createdAt",
      contacts_address_books: "id",
      contacts_cards: "id, addressBookId, pendingSync, updatedAt",
      notes_fixture_notebooks: "id",
      notes_fixture_pages: "id, notebookId",
    });
    await legacy.open();
    await legacy.table("notes_fixture_pages").put({
      id: "p1",
      notebookId: "nb1",
      body: "draft",
    });
    legacy.close();

    const db = new WgwOfflineDatabase("multi-migrate-notes");
    await db.open();

    const page = await notesFixturePagesTable(db).get("p1");
    expect(typeof page?.updatedAt).toBe("number");

    const byRecency = await notesFixturePagesTable(db).orderBy("updatedAt").toArray();
    expect(byRecency.map((row) => row.id)).toEqual(["p1"]);

    await db.delete();
  });

  it("currently merges colliding version store deltas instead of rejecting (#212)", async () => {
    registerOfflineDomainTables({
      domain: "collision-a",
      versions: [{ version: 50, stores: { collision_a_table: "id" } }],
    });
    registerOfflineDomainTables({
      domain: "collision-b",
      versions: [{ version: 50, stores: { collision_b_table: "id" } }],
    });

    const db = new WgwOfflineDatabase("collision-merge");
    await db.open();

    const names = db.tables.map((t) => t.name);
    expect(names).toContain("collision_a_table");
    expect(names).toContain("collision_b_table");

    await db.delete();
  });

  it.todo("rejects registration when two domains claim the same Dexie version (#212)");
});

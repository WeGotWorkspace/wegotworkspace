import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { WgwOfflineDatabase } from "@/lib/offline/core/offline-db";
// Side-effect import: registers the contacts domain tables (v2) and the
// additive updatedAt index migration (v3) under test.
import { contactsCardsTable } from "@/lib/offline/contacts/contacts-schema";

const dbName = (key: string) => `wgw-offline-${key}`;

describe("offline db migration layer", () => {
  it("opens fresh at the latest version with core + contacts tables", async () => {
    const db = new WgwOfflineDatabase("fresh-acct");
    await db.open();
    const names = db.tables.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(["meta", "outbox", "contacts_address_books", "contacts_cards"]),
    );
    expect(db.verno).toBe(3);
    await db.delete();
  });

  it("upgrades v1 -> latest, preserving core data and adding contacts tables", async () => {
    const legacy = new Dexie(dbName("upgrade-acct"));
    legacy.version(1).stores({ meta: "key", outbox: "id, domain, createdAt" });
    await legacy.open();
    await legacy.table("meta").put({ key: "contacts:session", value: "{}" });
    await legacy.table("outbox").put({
      id: "x",
      domain: "contacts",
      op: "update",
      payload: "{}",
      createdAt: 1,
      retries: 0,
    });
    legacy.close();

    const db = new WgwOfflineDatabase("upgrade-acct");
    await db.open();
    expect(await db.meta.get("contacts:session")).toBeTruthy();
    expect(await db.outbox.get("x")).toBeTruthy();
    expect(db.tables.map((t) => t.name)).toContain("contacts_cards");
    await db.delete();
  });

  it("backfills updatedAt and indexes it on the v2 -> v3 additive migration", async () => {
    const legacy = new Dexie(dbName("index-acct"));
    legacy.version(1).stores({ meta: "key", outbox: "id, domain, createdAt" });
    legacy.version(2).stores({
      meta: "key",
      outbox: "id, domain, createdAt",
      contacts_address_books: "id",
      contacts_cards: "id, addressBookId, pendingSync",
    });
    await legacy.open();
    await legacy.table("contacts_cards").put({
      id: "c1",
      addressBookId: "default",
      data: "{}",
      pendingSync: false,
    });
    legacy.close();

    const db = new WgwOfflineDatabase("index-acct");
    await db.open();

    const row = await contactsCardsTable(db).get("c1");
    expect(row).toBeTruthy();
    expect(typeof row?.updatedAt).toBe("number");

    // The new updatedAt index is usable for ordered queries after the migration.
    const byRecency = await contactsCardsTable(db).orderBy("updatedAt").toArray();
    expect(byRecency.map((r) => r.id)).toEqual(["c1"]);

    await db.delete();
  });
});

import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  registerOfflineDomainTables,
  resetOfflineDomainRegistrationsForTests,
  WgwOfflineDatabase,
} from "@/lib/offline/core/offline-db";
import {
  claimOfflineDomainVersions,
  CONTACTS_OFFLINE_VERSION,
  DOCS_OFFLINE_VERSION,
  resetOfflineVersionClaimsForTests,
  seedOfflineVersionOwnerForTests,
} from "@/lib/offline/core/offline-version-allocation";
import type { OfflineDomainRegistration } from "@/lib/offline/core/types";

const contactsRegistration: OfflineDomainRegistration = {
  domain: "contacts",
  versions: [
    {
      version: CONTACTS_OFFLINE_VERSION.tables,
      stores: {
        contacts_address_books: "id",
        contacts_cards: "id, addressBookId, pendingSync",
      },
    },
    {
      version: CONTACTS_OFFLINE_VERSION.updatedAtIndex,
      stores: {
        contacts_cards: "id, addressBookId, pendingSync, updatedAt",
      },
    },
  ],
};

function seedContactsDomain(): void {
  registerOfflineDomainTables(contactsRegistration);
}

describe("offline version allocation", () => {
  beforeEach(() => {
    resetOfflineVersionClaimsForTests();
    resetOfflineDomainRegistrationsForTests();
    seedContactsDomain();
  });

  it("throws when a domain has no allocated version range", () => {
    expect(() =>
      claimOfflineDomainVersions({
        domain: "unknown-app",
        versions: [{ version: 10, stores: { x: "id" } }],
      }),
    ).toThrow(/no allocated Dexie version range/);
  });

  it("throws when a version is outside the domain block", () => {
    expect(() =>
      registerOfflineDomainTables({
        domain: "notes",
        versions: [{ version: 3, stores: { notes_notes: "id" } }],
      }),
    ).toThrow(/allocated range is 10–19/);
  });

  it("throws when the same domain declares a version twice", () => {
    expect(() =>
      claimOfflineDomainVersions({
        domain: "notes",
        versions: [
          { version: 10, stores: { a: "id" } },
          { version: 10, stores: { b: "id" } },
        ],
      }),
    ).toThrow(/more than once/);
  });

  it("throws when two domains claim the same Dexie version", () => {
    seedOfflineVersionOwnerForTests(25, "notes");

    expect(() =>
      claimOfflineDomainVersions({
        domain: "docs",
        versions: [{ version: 25, stores: { calendar_events: "id" } }],
      }),
    ).toThrow(/already claimed by domain "notes"/);

    expect(() =>
      registerOfflineDomainTables({
        domain: "notes",
        versions: [{ version: 2, stores: { notes_notes: "id" } }],
      }),
    ).toThrow(/allocated range is 10–19/);
  });

  it("composes multiple domains into one linear Dexie version sequence", async () => {
    registerOfflineDomainTables({
      domain: "notes",
      versions: [
        { version: 10, stores: { notes_notes: "id" } },
        { version: 11, stores: { notes_notes: "id, updatedAt" } },
      ],
    });
    registerOfflineDomainTables({
      domain: "docs",
      versions: [
        { version: DOCS_OFFLINE_VERSION.tables, stores: { docs_files: "apiPath" } },
        {
          version: DOCS_OFFLINE_VERSION.pendingSyncIndex,
          stores: { docs_files: "apiPath, pendingSync" },
        },
      ],
    });

    const db = new WgwOfflineDatabase("multi-domain-acct");
    await db.open();

    expect(db.verno).toBe(DOCS_OFFLINE_VERSION.pendingSyncIndex);
    expect(db.tables.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "meta",
        "outbox",
        "contacts_address_books",
        "contacts_cards",
        "notes_notes",
        "docs_files",
      ]),
    );

    await db.delete();
  });
});

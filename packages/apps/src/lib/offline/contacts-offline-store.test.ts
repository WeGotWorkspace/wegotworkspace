import "fake-indexeddb/auto";
import { describe, expect, it, beforeEach } from "vitest";
import type { ContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  enqueueOutboxMutation,
  listOutboxMutations,
  readContactsBootstrapFromCache,
  upsertContactCardInCache,
  writeContactsBootstrapToCache,
} from "@/lib/offline/contacts-offline-store";

const username = "bob";

const bootstrap = {
  session: mockWorkspaceSession,
  data: {
    addressBooks: [
      {
        id: "default",
        name: "Default",
        sortOrder: 0,
        isDefault: true,
        isSubscribed: true,
        myRights: { mayRead: true, mayWrite: true, mayShare: false, mayDelete: true },
      },
    ],
    cards: [
      {
        id: "jane-doe",
        "@type": "Card",
        version: "1.0",
        uid: "urn:uuid:jane",
        addressBookIds: { default: true },
        name: { "@type": "Name", isOrdered: false, full: "Jane Doe" },
        state: "state-1",
      } as unknown as ContactCard,
    ],
  },
} satisfies ContactsAppBootstrap;

describe("contacts offline store", () => {
  beforeEach(async () => {
    await writeContactsBootstrapToCache(username, bootstrap);
  });

  it("reads bootstrap written to cache", async () => {
    const cached = await readContactsBootstrapFromCache(username);
    expect(cached?.data.cards[0]?.name?.full).toBe("Jane Doe");
  });

  it("orders outbox mutations by createdAt", async () => {
    await enqueueOutboxMutation(username, {
      id: "b",
      domain: "contacts",
      op: "update",
      payload: "{}",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await enqueueOutboxMutation(username, {
      id: "a",
      domain: "contacts",
      op: "update",
      payload: "{}",
    });
    const rows = await listOutboxMutations(username);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("preserves pendingSync cards when bootstrap is rewritten from server", async () => {
    const localCard = {
      ...bootstrap.data.cards[0],
      name: { "@type": "Name", isOrdered: false, full: "Bob Local" },
    } as ContactCard;
    await upsertContactCardInCache(username, localCard, true);

    await writeContactsBootstrapToCache(username, bootstrap);

    const cached = await readContactsBootstrapFromCache(username);
    expect(cached?.data.cards[0]?.name?.full).toBe("Bob Local");
  });
});

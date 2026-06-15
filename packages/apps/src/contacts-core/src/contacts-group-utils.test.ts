import { describe, expect, it } from "vitest";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  contactsGroupViewKey,
  filterCardsByView,
  groupRenamePatch,
  isContactGroupCard,
  listContactGroups,
  resolveGroupMemberCardIds,
  resolveGroupMemberCards,
} from "./contacts-group-utils";

const janeUid = "urn:uuid:550e8400-e29b-41d4-a716-446655440010";
const joeUid = "urn:uuid:550e8400-e29b-41d4-a716-446655440020";

const jane = {
  "@type": "Card",
  version: "1.0",
  id: "card-jane",
  uid: janeUid,
  addressBookIds: { default: true },
  name: { full: "Jane Doe" },
} as unknown as ContactCard;

const joe = {
  "@type": "Card",
  version: "1.0",
  id: "card-joe",
  uid: joeUid,
  addressBookIds: { default: true },
  name: { full: "Joe Example" },
} as unknown as ContactCard;

const friendsGroup = {
  "@type": "Card",
  version: "1.0",
  id: "card-group-friends",
  uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440100",
  kind: "group",
  addressBookIds: { default: true },
  name: { full: "Friends" },
  members: {
    [janeUid]: true,
    [joeUid]: true,
  },
} as unknown as ContactCard;

const familyGroup = {
  "@type": "Card",
  version: "1.0",
  id: "card-group-family",
  uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440101",
  kind: "group",
  addressBookIds: { default: true },
  name: { full: "Family" },
  members: {
    [janeUid]: true,
  },
} as unknown as ContactCard;

const cards = [jane, joe, friendsGroup, familyGroup];

describe("contacts-group-utils", () => {
  it("detects group cards by kind", () => {
    expect(isContactGroupCard(friendsGroup)).toBe(true);
    expect(isContactGroupCard(jane)).toBe(false);
  });

  it("detects Apple group cards without kind field", () => {
    const appleFriends = {
      "@type": "Card",
      version: "1.0",
      id: "card-apple-friends",
      uid: "08430ef3-a2ce-4568-9d6c-f50a6cfd32ae",
      addressBookIds: { default: true },
      name: { full: "Friends" },
      members: {
        [janeUid]: true,
        [joeUid]: true,
      },
    } as unknown as ContactCard;

    const appleViaVCardProps = {
      "@type": "Card",
      version: "1.0",
      id: "card-apple-vcardprops",
      uid: "08430ef3-a2ce-4568-9d6c-f50a6cfd32ae",
      addressBookIds: { default: true },
      name: { full: "Friends" },
      vCardProps: [["X-ADDRESSBOOKSERVER-KIND", [], "unknown", ["group"]]],
    } as unknown as ContactCard;

    expect(isContactGroupCard(appleFriends)).toBe(true);
    expect(isContactGroupCard(appleViaVCardProps)).toBe(true);
    expect(listContactGroups([jane, appleFriends]).map((c) => c.id)).toEqual([
      "card-apple-friends",
    ]);
  });

  it("lists group cards sorted by display name", () => {
    expect(listContactGroups(cards).map((card) => card.id)).toEqual([
      "card-group-family",
      "card-group-friends",
    ]);
  });

  it("resolves member uids to card ids", () => {
    expect(resolveGroupMemberCardIds(friendsGroup, cards)).toEqual(["card-jane", "card-joe"]);
    expect(resolveGroupMemberCardIds(familyGroup, cards)).toEqual(["card-jane"]);
    expect(resolveGroupMemberCards(friendsGroup, cards).map((card) => card.id)).toEqual([
      "card-jane",
      "card-joe",
    ]);
  });

  it("prefers server memberCardIds when present", () => {
    const groupWithApiIds = {
      ...friendsGroup,
      memberCardIds: {
        [joeUid]: "card-joe",
        [janeUid]: "card-jane",
      },
    } as unknown as ContactCard;

    expect(resolveGroupMemberCardIds(groupWithApiIds, cards)).toEqual(["card-jane", "card-joe"]);
  });

  it("excludes group cards from all and address book views", () => {
    expect(filterCardsByView(cards, "all").map((card) => card.id)).toEqual([
      "card-jane",
      "card-joe",
    ]);
    expect(filterCardsByView(cards, "book:default").map((card) => card.id)).toEqual([
      "card-jane",
      "card-joe",
    ]);
  });

  it("shows only group members in group view", () => {
    expect(
      filterCardsByView(cards, contactsGroupViewKey("card-group-friends")).map((c) => c.id),
    ).toEqual(["card-jane", "card-joe"]);
    expect(
      filterCardsByView(cards, contactsGroupViewKey("card-group-family")).map((c) => c.id),
    ).toEqual(["card-jane"]);
  });

  it("builds group rename patch with trimmed name.full", () => {
    expect(groupRenamePatch("  Close Friends  ")).toEqual({
      name: { "@type": "Name", isOrdered: false, full: "Close Friends" },
    });
  });

  it("returns empty list for group with no resolved members", () => {
    const emptyGroup = {
      ...friendsGroup,
      id: "card-group-empty",
      members: { "urn:uuid:missing-member": true },
    } as unknown as ContactCard;

    expect(
      filterCardsByView([...cards, emptyGroup], contactsGroupViewKey("card-group-empty")).map(
        (c) => c.id,
      ),
    ).toEqual([]);
  });
});

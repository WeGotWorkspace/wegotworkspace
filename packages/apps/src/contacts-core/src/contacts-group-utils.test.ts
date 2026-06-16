import { describe, expect, it } from "vitest";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  contactsGroupViewKey,
  filterCardsByView,
  groupAddMembersPatch,
  groupRemoveMembersPatch,
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

  it("resolves Apple group members when card uids omit urn prefix", () => {
    const appleJaneUid = "c4cf6038-5da0-41be-9c2d-d8cb9b4af90f";
    const appleJoeUid = "07d442ce-49b5-4a59-bc01-d75b17b92c9a";

    const appleJane = {
      "@type": "Card",
      version: "1.0",
      id: "card-apple-jane",
      uid: appleJaneUid,
      addressBookIds: { default: true },
      name: { full: "Jane Doe" },
    } as unknown as ContactCard;

    const appleJoe = {
      "@type": "Card",
      version: "1.0",
      id: "card-apple-joe",
      uid: appleJoeUid,
      addressBookIds: { default: true },
      name: { full: "Joe Example" },
    } as unknown as ContactCard;

    const appleFriendsGroup = {
      "@type": "Card",
      version: "1.0",
      id: "card-apple-friends-group",
      uid: "08430ef3-a2ce-4568-9d6c-f50a6cfd32ae",
      addressBookIds: { default: true },
      name: { full: "Friends" },
      members: {
        [`urn:uuid:${appleJaneUid}`]: true,
        [`urn:uuid:${appleJoeUid}`]: true,
      },
    } as unknown as ContactCard;

    const appleCards = [appleJane, appleJoe, appleFriendsGroup];

    expect(resolveGroupMemberCardIds(appleFriendsGroup, appleCards)).toEqual([
      "card-apple-jane",
      "card-apple-joe",
    ]);
    expect(
      filterCardsByView(appleCards, contactsGroupViewKey("card-apple-friends-group")).map(
        (c) => c.id,
      ),
    ).toEqual(["card-apple-jane", "card-apple-joe"]);
  });

  it("deduplicates resolved card ids when members map has both bare and urn:uuid: forms of the same uid", () => {
    const bareJaneUid = "550e8400-e29b-41d4-a716-446655440010";
    const groupWithDuplicateUidForms = {
      ...familyGroup,
      id: "card-group-dup",
      // both forms resolve to the same card
      members: {
        [bareJaneUid]: true,
        [`urn:uuid:${bareJaneUid}`]: true,
      },
    } as unknown as ContactCard;
    const janeWithBareUid = { ...jane, uid: bareJaneUid } as unknown as ContactCard;

    const resolved = resolveGroupMemberCardIds(groupWithDuplicateUidForms, [
      janeWithBareUid,
      joe,
      groupWithDuplicateUidForms,
    ]);
    // jane must appear only once even though two member entries resolve to her
    expect(resolved).toEqual(["card-jane"]);
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

  it("returns group members sorted by display name regardless of members insertion order", () => {
    const zoeUid = "urn:uuid:550e8400-e29b-41d4-a716-446655440030";
    const zoe = {
      "@type": "Card",
      version: "1.0",
      id: "card-zoe",
      uid: zoeUid,
      addressBookIds: { default: true },
      name: { full: "Zoe Last" },
    } as unknown as ContactCard;

    // members map with Zoe inserted before Jane (would appear first without sort)
    const groupUnsortedInsertionOrder = {
      ...friendsGroup,
      id: "card-group-unsorted",
      members: {
        [zoeUid]: true,
        [janeUid]: true,
      },
    } as unknown as ContactCard;

    const result = filterCardsByView(
      [...cards, zoe, groupUnsortedInsertionOrder],
      contactsGroupViewKey("card-group-unsorted"),
    );
    // Jane (J) < Zoe (Z) alphabetically
    expect(result.map((c) => c.id)).toEqual(["card-jane", "card-zoe"]);
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

describe("groupAddMembersPatch", () => {
  it("adds new members by uid", () => {
    const patch = groupAddMembersPatch(familyGroup, [joe]);
    expect(patch).toEqual({ members: { [joeUid]: true } });
  });

  it("returns null when all cards are already members", () => {
    expect(groupAddMembersPatch(friendsGroup, [jane, joe])).toBeNull();
  });

  it("returns null when card list is empty", () => {
    expect(groupAddMembersPatch(friendsGroup, [])).toBeNull();
  });

  it("skips cards without a uid", () => {
    const noUid = { ...jane, uid: undefined } as unknown as ContactCard;
    expect(groupAddMembersPatch(familyGroup, [noUid])).toBeNull();
  });

  it("skips group cards to prevent nesting", () => {
    expect(groupAddMembersPatch(familyGroup, [friendsGroup])).toBeNull();
  });

  it("adds only the cards not yet in the group", () => {
    const patch = groupAddMembersPatch(familyGroup, [jane, joe]);
    // jane is already a member of familyGroup; only joe is new
    expect(patch).toEqual({ members: { [joeUid]: true } });
  });

  it("skips cards already in group even when UID format differs (bare uuid vs urn:uuid:)", () => {
    // Group stores member with bare UUID key (Apple CardDAV format)
    const bareJaneUid = "550e8400-e29b-41d4-a716-446655440010";
    const groupWithBareUid = {
      ...familyGroup,
      members: { [bareJaneUid]: true },
    } as unknown as ContactCard;
    // jane's uid is in urn:uuid: form — must not be added as a second entry
    const janeWithUrnUid = { ...jane, uid: `urn:uuid:${bareJaneUid}` } as unknown as ContactCard;
    expect(groupAddMembersPatch(groupWithBareUid, [janeWithUrnUid])).toBeNull();
  });

  it("skips cards already in group even when group key uses urn:uuid: but card uid is bare", () => {
    // Group stores member with full urn:uuid: key
    const fullUid = "urn:uuid:550e8400-e29b-41d4-a716-446655440010";
    const groupWithUrnKey = {
      ...familyGroup,
      members: { [fullUid]: true },
    } as unknown as ContactCard;
    const janeWithBareUid = {
      ...jane,
      uid: "550e8400-e29b-41d4-a716-446655440010",
    } as unknown as ContactCard;
    expect(groupAddMembersPatch(groupWithUrnKey, [janeWithBareUid])).toBeNull();
  });
});

describe("groupRemoveMembersPatch", () => {
  it("removes a member by resolving card id to uid", () => {
    const patch = groupRemoveMembersPatch(friendsGroup, ["card-jane"], cards);
    expect(patch).toEqual({ members: { [janeUid]: false } });
  });

  it("removes multiple members at once", () => {
    const patch = groupRemoveMembersPatch(friendsGroup, ["card-jane", "card-joe"], cards);
    expect(patch).toEqual({ members: { [janeUid]: false, [joeUid]: false } });
  });

  it("returns null when card id is not a member", () => {
    const stranger = {
      "@type": "Card",
      version: "1.0",
      id: "card-stranger",
      uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440099",
      addressBookIds: { default: true },
      name: { full: "Stranger" },
    } as unknown as ContactCard;
    expect(
      groupRemoveMembersPatch(friendsGroup, ["card-stranger"], [...cards, stranger]),
    ).toBeNull();
  });

  it("returns null when card list is empty", () => {
    expect(groupRemoveMembersPatch(friendsGroup, [], cards)).toBeNull();
  });

  it("returns null when group has no members", () => {
    const emptyGroup = {
      ...friendsGroup,
      id: "card-group-empty",
      members: {},
    } as unknown as ContactCard;
    expect(groupRemoveMembersPatch(emptyGroup, ["card-jane"], cards)).toBeNull();
  });

  it("resolves via server memberCardIds when present", () => {
    const groupWithApiIds = {
      ...friendsGroup,
      memberCardIds: {
        [janeUid]: "card-jane",
        [joeUid]: "card-joe",
      },
    } as unknown as ContactCard;
    const patch = groupRemoveMembersPatch(groupWithApiIds, ["card-jane"], cards);
    expect(patch).toEqual({ members: { [janeUid]: false } });
  });
});

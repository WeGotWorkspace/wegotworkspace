import {
  contactDisplayName,
  contactListSortName,
} from "@/contacts-core/src/contacts-display-utils";
import type { ContactCard, ContactCardPatch } from "@/contacts-core/src/contacts-types";

/**
 * JSContact / CardDAV group mapping (RFC 9553 + RFC 9610):
 * - vCard `KIND:group` and Apple `X-ADDRESSBOOKSERVER-KIND:group` → `kind: "group"`.
 * - vCard `MEMBER` / `X-ABGroupMember` URIs → `members` map (member uid → true).
 * - JMAP Contacts uses the same `kind` + `members` fields; REST list/get includes them after
 *   vCard conversion. Optional `memberCardIds` (uid → card id) is added server-side when a
 *   member uid resolves in the user's address books (not in OpenAPI yet).
 */
export type ContactCardWithResolvedMembers = ContactCard & {
  memberCardIds?: Record<string, string>;
};

function vCardPropIndicatesGroup(card: ContactCard): boolean {
  const props = card.vCardProps;
  if (!props?.length) return false;
  for (const tuple of props) {
    if (!Array.isArray(tuple) || tuple.length < 4) continue;
    const name = String(tuple[0]).toUpperCase();
    if (name !== "KIND" && name !== "X-ADDRESSBOOKSERVER-KIND") continue;
    const raw = tuple[3];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (String(value).toLowerCase() === "group") return true;
  }
  return false;
}

function hasGroupMembers(card: ContactCard): boolean {
  const members = card.members;
  if (!members) return false;
  return Object.values(members).some(Boolean);
}

export function isContactGroupCard(card: ContactCard): boolean {
  if (card.kind === "group") return true;
  if (hasGroupMembers(card)) return true;
  return vCardPropIndicatesGroup(card);
}

export function listContactGroups(cards: ContactCard[]): ContactCard[] {
  return cards.filter(isContactGroupCard).sort((left, right) =>
    contactDisplayName(left).localeCompare(contactDisplayName(right), undefined, {
      sensitivity: "base",
    }),
  );
}

function enabledMemberUids(members: ContactCard["members"]): string[] {
  if (!members) return [];
  return Object.entries(members)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([uid]) => uid);
}

/** Apple CardDAV: group members often use urn:uuid: while card uid is bare UUID. */
function normalizeContactUidForMatch(uid: string): string {
  const trimmed = uid.trim();
  if (trimmed.toLowerCase().startsWith("urn:uuid:")) {
    return trimmed.slice("urn:uuid:".length).toLowerCase();
  }
  return trimmed.toLowerCase();
}

function indexCardsByNormalizedUid(cards: ContactCard[]): Map<string, ContactCard> {
  const byUid = new Map<string, ContactCard>();
  for (const card of cards) {
    if (!card.uid) continue;
    byUid.set(normalizeContactUidForMatch(card.uid), card);
  }
  return byUid;
}

/** Resolve group member uids to loaded card ids (API memberCardIds first, then uid scan). */
export function resolveGroupMemberCardIds(
  groupCard: ContactCard,
  allCards: ContactCard[],
): string[] {
  const memberUids = enabledMemberUids(groupCard.members);
  if (memberUids.length === 0) return [];

  const cardById = new Map(allCards.map((card) => [card.id, card]));
  const cardByNormalizedUid = indexCardsByNormalizedUid(allCards);
  const memberCardIds = (groupCard as ContactCardWithResolvedMembers).memberCardIds;

  const resolved: string[] = [];
  const seenIds = new Set<string>();
  for (const uid of memberUids) {
    const fromApi = memberCardIds?.[uid];
    if (fromApi && cardById.has(fromApi) && !isContactGroupCard(cardById.get(fromApi)!)) {
      if (!seenIds.has(fromApi)) {
        seenIds.add(fromApi);
        resolved.push(fromApi);
      }
      continue;
    }

    const byUid = cardByNormalizedUid.get(normalizeContactUidForMatch(uid));
    if (byUid && !isContactGroupCard(byUid) && !seenIds.has(byUid.id)) {
      seenIds.add(byUid.id);
      resolved.push(byUid.id);
    }
  }

  return resolved;
}

/** Resolve group member uids to loaded contact cards (members + memberCardIds). */
export function resolveGroupMemberCards(
  groupCard: ContactCard,
  allCards: ContactCard[],
): ContactCard[] {
  const cardById = new Map(allCards.map((card) => [card.id, card]));
  return resolveGroupMemberCardIds(groupCard, allCards)
    .map((id) => cardById.get(id))
    .filter((card): card is ContactCard => card !== undefined);
}

/** PATCH body for renaming a group card (JSContact name.full). */
export function groupRenamePatch(name: string): ContactCardPatch {
  return {
    name: {
      "@type": "Name",
      isOrdered: false,
      full: name.trim(),
    },
  };
}

/**
 * Build a PATCH that adds contacts to a group's `members` map.
 * Filters out cards that are already members and group cards (no nesting).
 * Returns null when there is nothing new to add.
 */
export function groupAddMembersPatch(
  groupCard: ContactCard,
  cardsToAdd: ContactCard[],
): ContactCardPatch | null {
  const existingNormalizedUids = new Set(
    Object.entries(groupCard.members ?? {})
      .filter(([, enabled]) => Boolean(enabled))
      .map(([uid]) => normalizeContactUidForMatch(uid)),
  );

  const newMembers: Record<string, true> = {};
  for (const card of cardsToAdd) {
    if (!card.uid) continue;
    if (isContactGroupCard(card)) continue;
    if (existingNormalizedUids.has(normalizeContactUidForMatch(card.uid))) continue;
    newMembers[card.uid] = true;
  }
  if (Object.keys(newMembers).length === 0) return null;
  return { members: newMembers };
}

/**
 * Build a PATCH that removes contacts from a group's `members` map.
 * Resolves card IDs to their member-map UIDs and sets those entries to false.
 * Returns null when none of the given card IDs are currently active members.
 */
export function groupRemoveMembersPatch(
  groupCard: ContactCard,
  cardIds: string[],
  allCards: ContactCard[],
): ContactCardPatch | null {
  if (!groupCard.members || cardIds.length === 0) return null;

  const cardById = new Map(allCards.map((card) => [card.id, card]));
  const cardByNormalizedUid = indexCardsByNormalizedUid(allCards);
  const memberCardIds = (groupCard as ContactCardWithResolvedMembers).memberCardIds;

  const removedMembers: Record<string, boolean> = {};
  for (const [uid, enabled] of Object.entries(groupCard.members)) {
    if (!enabled) continue;

    const fromApi = memberCardIds?.[uid];
    let resolvedId: string | undefined;
    if (fromApi && cardById.has(fromApi)) {
      resolvedId = fromApi;
    } else {
      const byUid = cardByNormalizedUid.get(normalizeContactUidForMatch(uid));
      if (byUid) resolvedId = byUid.id;
    }

    if (resolvedId && cardIds.includes(resolvedId)) {
      removedMembers[uid] = false;
    }
  }

  if (Object.keys(removedMembers).length === 0) return null;
  return { members: removedMembers as ContactCardPatch["members"] };
}

/** Sidebar/list view key for a group card. */
export function contactsGroupViewKey(groupCardId: string): string {
  return `group:${groupCardId}`;
}

export function filterCardsByView(cards: ContactCard[], view: string): ContactCard[] {
  if (view.startsWith("group:")) {
    const groupId = view.slice("group:".length);
    const groupCard = cards.find((card) => card.id === groupId);
    if (!groupCard || !isContactGroupCard(groupCard)) return [];
    return resolveGroupMemberCards(groupCard, cards).sort((a, b) =>
      contactListSortName(a).localeCompare(contactListSortName(b), undefined, {
        sensitivity: "base",
      }),
    );
  }

  let scoped = cards;
  if (view.startsWith("book:")) {
    const bookId = view.slice("book:".length);
    scoped = cards.filter((card) => Boolean(card.addressBookIds?.[bookId]));
  }

  return scoped.filter((card) => !isContactGroupCard(card));
}

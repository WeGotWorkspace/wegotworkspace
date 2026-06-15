import { contactDisplayName } from "@/contacts-core/src/contacts-display-utils";
import type { ContactCard } from "@/contacts-core/src/contacts-types";

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

export function isContactGroupCard(card: ContactCard): boolean {
  return card.kind === "group";
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

/** Resolve group member uids to loaded card ids (API memberCardIds first, then uid scan). */
export function resolveGroupMemberCardIds(
  groupCard: ContactCard,
  allCards: ContactCard[],
): string[] {
  const memberUids = enabledMemberUids(groupCard.members);
  if (memberUids.length === 0) return [];

  const cardById = new Map(allCards.map((card) => [card.id, card]));
  const cardByUid = new Map(allCards.map((card) => [card.uid, card]));
  const memberCardIds = (groupCard as ContactCardWithResolvedMembers).memberCardIds;

  const resolved: string[] = [];
  for (const uid of memberUids) {
    const fromApi = memberCardIds?.[uid];
    if (fromApi && cardById.has(fromApi) && !isContactGroupCard(cardById.get(fromApi)!)) {
      resolved.push(fromApi);
      continue;
    }

    const byUid = cardByUid.get(uid);
    if (byUid && !isContactGroupCard(byUid)) {
      resolved.push(byUid.id);
    }
  }

  return resolved;
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
    const memberIds = new Set(resolveGroupMemberCardIds(groupCard, cards));
    return cards.filter((card) => memberIds.has(card.id));
  }

  let scoped = cards;
  if (view.startsWith("book:")) {
    const bookId = view.slice("book:".length);
    scoped = cards.filter((card) => Boolean(card.addressBookIds?.[bookId]));
  }

  return scoped.filter((card) => !isContactGroupCard(card));
}

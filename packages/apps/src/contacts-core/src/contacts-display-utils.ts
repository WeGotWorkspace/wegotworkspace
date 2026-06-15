import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  readContactContext,
  type ContactChannelContext,
} from "@/contacts-core/src/contacts-edit-utils";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

function channelTypeLabel(contextType: ContactChannelContext, labels: ContactsUILabels): string {
  if (contextType === "work") return labels.channelTypeWork;
  if (contextType === "home") return labels.channelTypeHome;
  if (contextType === "school") return labels.channelTypeSchool;
  return labels.channelTypeNone;
}

/** Read-mode label for phones, emails, addresses, and links from JSContact contexts or custom label. */
export function channelDisplayLabel(
  contexts: Record<string, boolean | undefined> | undefined,
  labels: ContactsUILabels,
  customLabel?: string,
): string | undefined {
  const contextType = readContactContext(contexts);
  if (contextType !== "") return channelTypeLabel(contextType, labels);
  const trimmed = customLabel?.trim();
  if (trimmed) return trimmed;
  return undefined;
}

export function mapEntriesSorted<T>(map: Record<string, T> | undefined): [string, T][] {
  if (!map) return [];
  return Object.entries(map).sort(([left], [right]) => left.localeCompare(right));
}

function firstMapValue<T>(map: Record<string, T> | undefined): T | undefined {
  const [entry] = mapEntriesSorted(map);
  return entry?.[1];
}

function nameFromComponents(card: ContactCard): string {
  const components = card.name?.components;
  if (!components?.length) return "";

  const given = components
    .filter((component) => component.kind === "given" || component.kind === "given2")
    .map((component) => component.value.trim())
    .filter(Boolean);
  const surname = components
    .filter((component) => component.kind === "surname" || component.kind === "surname2")
    .map((component) => component.value.trim())
    .filter(Boolean);
  const synthesized = [...given, ...surname].join(" ").trim();
  if (synthesized) return synthesized;

  return components
    .map((component) => component.value.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function contactDisplayName(card: ContactCard): string {
  const full = card.name?.full?.trim();
  if (full) return full;

  const fromComponents = nameFromComponents(card);
  if (fromComponents) return fromComponents;

  return "Unknown contact";
}

function firstOrganizationName(card: ContactCard): string | undefined {
  const organization = firstMapValue(card.organizations);
  const name = organization?.name?.trim();
  if (name) return name;
  return organization?.units?.[0]?.name?.trim() || undefined;
}

function firstEmailAddress(card: ContactCard): string | undefined {
  return firstMapValue(card.emails)?.address?.trim() || undefined;
}

function firstPhoneNumber(card: ContactCard): string | undefined {
  const phone = firstMapValue(card.phones);
  const number = phone?.number;
  return typeof number === "string" ? number.trim() : undefined;
}

export function contactListSubtitle(card: ContactCard): string {
  return firstOrganizationName(card) ?? firstEmailAddress(card) ?? firstPhoneNumber(card) ?? "";
}

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function collectEmails(card: ContactCard): string[] {
  return mapEntriesSorted(card.emails)
    .map(([, email]) => email.address?.trim())
    .filter((value): value is string => Boolean(value));
}

function collectPhones(card: ContactCard): string[] {
  return mapEntriesSorted(card.phones)
    .map(([, phone]) => (typeof phone.number === "string" ? phone.number.trim() : ""))
    .filter(Boolean);
}

export function filterCardsBySearch(cards: ContactCard[], query: string): ContactCard[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return cards;

  return cards.filter((card) => {
    const haystack = [
      contactDisplayName(card),
      contactListSubtitle(card),
      ...collectEmails(card),
      ...collectPhones(card),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

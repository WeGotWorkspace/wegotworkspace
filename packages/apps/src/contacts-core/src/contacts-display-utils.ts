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

const PHONE_FEATURE_KEYS = [
  "mobile",
  "fax",
  "main-number",
  "pager",
  "text",
  "textphone",
  "video",
  "voice",
] as const;

type PhoneFeatureKey = (typeof PHONE_FEATURE_KEYS)[number];

/** vCard TYPE names for JSContact `Phone.features` keys (RFC 9555 TEL table). */
function phoneFeatureDisplayLabel(featureKey: PhoneFeatureKey): string {
  if (featureKey === "mobile") return "cell";
  return featureKey;
}

function collectPhoneFeatureLabels(
  features?: Record<string, boolean | undefined>,
  contexts?: Record<string, boolean | undefined>,
): PhoneFeatureKey[] {
  const active = new Set<PhoneFeatureKey>();
  for (const source of [features, contexts]) {
    if (!source) continue;
    for (const key of PHONE_FEATURE_KEYS) {
      if (source[key]) active.add(key);
    }
  }
  return PHONE_FEATURE_KEYS.filter((key) => active.has(key));
}

function splitCommaSeparatedLabel(label: string): string[] {
  return label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeCustomLabelToken(token: string, labels: ContactsUILabels): string {
  const key = token.toLowerCase();
  if (key === "home") return labels.channelTypeHome;
  if (key === "work") return labels.channelTypeWork;
  if (key === "school") return labels.channelTypeSchool;
  if (key === "cell" || key === "mobile") return "cell";
  if ((PHONE_FEATURE_KEYS as readonly string[]).includes(key)) {
    return phoneFeatureDisplayLabel(key as PhoneFeatureKey);
  }
  return token.trim();
}

function customLabelsFromString(
  customLabel: string,
  labels: ContactsUILabels,
  existing: Set<string>,
): string[] {
  return splitCommaSeparatedLabel(customLabel)
    .map((part) => normalizeCustomLabelToken(part, labels))
    .filter((label) => !existing.has(label));
}

export type ChannelDisplayLabelOptions = {
  features?: Record<string, boolean | undefined>;
  customLabel?: string;
};

/**
 * Read-mode labels for phones, emails, addresses, and links.
 * Phones may emit multiple tags (feature + context); other channels emit at most one context/custom tag.
 */
export function channelDisplayLabels(
  contexts: Record<string, boolean | undefined> | undefined,
  labels: ContactsUILabels,
  options?: ChannelDisplayLabelOptions,
): string[] {
  const featureLabels = collectPhoneFeatureLabels(options?.features, contexts).map(
    phoneFeatureDisplayLabel,
  );

  const contextType = readContactContext(contexts);
  const contextLabel = contextType !== "" ? channelTypeLabel(contextType, labels) : undefined;

  const trimmedCustom = options?.customLabel?.trim();
  const existingLabels = new Set([...featureLabels, ...(contextLabel ? [contextLabel] : [])]);
  const customLabels = trimmedCustom
    ? customLabelsFromString(trimmedCustom, labels, existingLabels)
    : [];

  const resolved = [...featureLabels, ...(contextLabel ? [contextLabel] : []), ...customLabels];

  if (resolved.length === 1 && resolved[0] === "voice") {
    return [];
  }

  return resolved;
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

/** Person name from `name.full` or name components — not organization. */
export function contactPersonName(card: ContactCard): string {
  const full = card.name?.full?.trim();
  if (full) return full;
  return nameFromComponents(card);
}

export function contactDisplayName(card: ContactCard): string {
  const organizationName = firstOrganizationName(card);
  const personName = contactPersonName(card);

  if (card.kind === "org") {
    if (organizationName) return organizationName;
    if (personName) return personName;
    return "Unknown contact";
  }

  if (personName) return personName;
  if (organizationName) return organizationName;

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
  const organizationName = firstOrganizationName(card);
  const personName = contactPersonName(card);
  const displayName = contactDisplayName(card);

  if (card.kind === "org") {
    if (personName && personName !== displayName) {
      return personName;
    }
    return firstEmailAddress(card) ?? firstPhoneNumber(card) ?? "";
  }

  if (organizationName && organizationName !== displayName) {
    return organizationName;
  }

  return firstEmailAddress(card) ?? firstPhoneNumber(card) ?? "";
}

/** Secondary list line — contact detail not already shown in the subtitle. */
export function contactListDetail(card: ContactCard): string {
  const subtitle = contactListSubtitle(card);
  const email = firstEmailAddress(card);
  const phone = firstPhoneNumber(card);

  if (email && email !== subtitle) return email;
  if (phone && phone !== subtitle) return phone;
  return "";
}

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Default REST path for contact media blobs (RFC 9610); appended with blobId. */
export const CONTACT_MEDIA_BLOB_PATH = "/api/v1/contacts/blobs";

type ContactPhotoUrlOptions = {
  /** Base path for blob download URLs; defaults to {@link CONTACT_MEDIA_BLOB_PATH}. */
  blobBaseUrl?: string;
};

function resolveMediaEntryUrl(
  entry: NonNullable<ContactCard["media"]>[string],
  blobBaseUrl: string,
): string | undefined {
  const uri = typeof entry.uri === "string" ? entry.uri.trim() : "";
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) {
    return uri;
  }

  const blobId = typeof entry.blobId === "string" ? entry.blobId.trim() : "";
  if (blobId) {
    return `${blobBaseUrl.replace(/\/$/, "")}/${blobId}`;
  }

  return undefined;
}

/**
 * Photo URL from JSContact `media` (RFC 9553). CardDAV PHOTO/LOGO is mapped server-side
 * into `media` entries; inline vCard binary becomes `uri` (data:) or `blobId` on GET.
 */
export function contactPhotoUrl(
  card: ContactCard,
  options?: ContactPhotoUrlOptions,
): string | undefined {
  const media = card.media;
  if (!media) return undefined;

  const blobBaseUrl = options?.blobBaseUrl ?? CONTACT_MEDIA_BLOB_PATH;
  const preferredKinds =
    card.kind === "org" ? (["logo", "photo"] as const) : (["photo", "logo"] as const);

  for (const kind of preferredKinds) {
    for (const [, entry] of mapEntriesSorted(media)) {
      if (entry.kind !== kind) continue;
      const url = resolveMediaEntryUrl(entry, blobBaseUrl);
      if (url) return url;
    }
  }

  return undefined;
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
      contactListDetail(card),
      ...collectEmails(card),
      ...collectPhones(card),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

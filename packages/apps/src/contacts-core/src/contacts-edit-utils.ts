import { mapEntriesSorted } from "@/contacts-core/src/contacts-display-utils";
import type {
  AddressBook,
  ContactCard,
  ContactCardCreate,
  ContactCardPatch,
} from "@/contacts-core/src/contacts-types";

export const CONTACTS_CREATE_ID = "__contacts_create__";

/** JSContact channel context values exposed in the edit UI (maps to `contexts` on phones/emails/addresses). */
export const CONTACT_CHANNEL_CONTEXTS = ["", "home", "work"] as const;
export type ContactChannelContext = (typeof CONTACT_CHANNEL_CONTEXTS)[number];

export type ContactEditDraft = {
  nameGiven: string;
  nameGiven2: string;
  nameSurname: string;
  showGiven2: boolean;
  phones: Array<{ id: string; number: string; contextType: ContactChannelContext }>;
  emails: Array<{ id: string; address: string; contextType: ContactChannelContext }>;
  addresses: Array<{ id: string; full: string; contextType: ContactChannelContext }>;
  organization: string;
  notes: string;
  organizationId?: string;
  notesId?: string;
};

export function newContactMapId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `contact-${Math.random().toString(36).slice(2, 11)}`;
}

export function resolveDefaultContactsView(addressBooks: AddressBook[]): string {
  const defaultBook = addressBooks.find((book) => book.isDefault) ?? addressBooks[0];
  return defaultBook ? `book:${defaultBook.id}` : "all";
}

export function resolveCreateAddressBookIds(
  view: string,
  addressBooks: AddressBook[],
): Record<string, true> {
  if (view.startsWith("book:")) {
    const bookId = view.slice(5);
    return { [bookId]: true };
  }
  const defaultBook = addressBooks.find((book) => book.isDefault) ?? addressBooks[0];
  if (!defaultBook) {
    throw new Error("No address book available for create");
  }
  return { [defaultBook.id]: true };
}

export function emptyContactEditDraft(): ContactEditDraft {
  return {
    nameGiven: "",
    nameGiven2: "",
    nameSurname: "",
    showGiven2: false,
    phones: [],
    emails: [],
    addresses: [],
    organization: "",
    notes: "",
  };
}

export function readContactContext(
  contexts?: Record<string, boolean | undefined>,
): ContactChannelContext {
  if (contexts?.work) return "work";
  if (contexts?.private) return "home";
  return "";
}

export function contactContextToPatch(
  contextType: ContactChannelContext,
): Record<string, true> | undefined {
  if (contextType === "work") return { work: true };
  if (contextType === "home") return { private: true };
  return undefined;
}

function readPhoneNumber(phone: NonNullable<ContactCard["phones"]>[string]): string {
  if (typeof phone.number === "string") return phone.number.trim();
  if (typeof phone.uri === "string") return phone.uri.trim();
  return "";
}

function readAddressLine(address: NonNullable<ContactCard["addresses"]>[string]): string {
  if (typeof address.full === "string" && address.full.trim()) {
    return address.full.trim();
  }
  const components = address.components ?? [];
  const fromComponents = components
    .map((part) => part.value?.trim())
    .filter(Boolean)
    .join(", ");
  if (fromComponents) return fromComponents;

  const legacy = [
    (address as { street?: string }).street,
    (address as { locality?: string }).locality,
    (address as { region?: string }).region,
    (address as { postcode?: string }).postcode,
    (address as { country?: string }).country,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return legacy.join(", ");
}

function componentValue(
  components: NonNullable<ContactCard["name"]>["components"],
  kind: "given" | "given2" | "surname" | "surname2",
): string {
  return (components ?? [])
    .filter((component) => component.kind === kind)
    .map((component) => component.value.trim())
    .filter(Boolean)
    .join(" ");
}

function splitFullName(fullName: string): { given: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      given: parts.slice(0, -1).join(" "),
      surname: parts[parts.length - 1] ?? "",
    };
  }
  return { given: fullName.trim(), surname: "" };
}

function phoneValue(
  card: ContactCard,
  id: string,
): { number: string; contextType: ContactChannelContext } {
  const phone = card.phones?.[id];
  if (!phone) return { number: "", contextType: "" };
  return {
    number: readPhoneNumber(phone),
    contextType: readContactContext(phone.contexts),
  };
}

function emailValue(
  card: ContactCard,
  id: string,
): { address: string; contextType: ContactChannelContext } {
  const email = card.emails?.[id];
  return {
    address: email?.address?.trim() ?? "",
    contextType: readContactContext(email?.contexts),
  };
}

function addressValue(
  card: ContactCard,
  id: string,
): { full: string; contextType: ContactChannelContext } {
  const address = card.addresses?.[id];
  if (!address) return { full: "", contextType: "" };
  return {
    full: readAddressLine(address),
    contextType: readContactContext(address.contexts),
  };
}

export function contactCardToEditDraft(card: ContactCard): ContactEditDraft {
  const components = card.name?.components ?? [];
  let nameGiven = componentValue(components, "given");
  const nameGiven2 = componentValue(components, "given2");
  let nameSurname = componentValue(components, "surname");
  const fullName = card.name?.full?.trim() ?? "";

  if (!nameGiven && !nameGiven2 && !nameSurname && fullName) {
    const split = splitFullName(fullName);
    nameGiven = split.given;
    nameSurname = split.surname;
  }

  const [organizationId, organizationEntry] = mapEntriesSorted(card.organizations)[0] ?? [];
  const [notesId, notesEntry] = mapEntriesSorted(card.notes)[0] ?? [];

  return {
    nameGiven,
    nameGiven2,
    nameSurname,
    showGiven2: Boolean(nameGiven2),
    phones: mapEntriesSorted(card.phones).map(([id, phone]) => ({
      id,
      number: readPhoneNumber(phone),
      contextType: readContactContext(phone.contexts),
    })),
    emails: mapEntriesSorted(card.emails).map(([id, email]) => ({
      id,
      address: email.address?.trim() ?? "",
      contextType: readContactContext(email.contexts),
    })),
    addresses: mapEntriesSorted(card.addresses).map(([id, address]) => ({
      id,
      full: readAddressLine(address),
      contextType: readContactContext(address.contexts),
    })),
    organization: organizationEntry?.name?.trim() ?? "",
    organizationId,
    notes: notesEntry?.note?.trim() ?? "",
    notesId,
  };
}

function buildNameFromDraft(draft: ContactEditDraft): ContactCardCreate["name"] | undefined {
  const components = [];
  if (draft.nameGiven.trim()) {
    components.push({ kind: "given" as const, value: draft.nameGiven.trim() });
  }
  if (draft.nameGiven2.trim()) {
    components.push({ kind: "given2" as const, value: draft.nameGiven2.trim() });
  }
  if (draft.nameSurname.trim()) {
    components.push({ kind: "surname" as const, value: draft.nameSurname.trim() });
  }
  if (components.length === 0) return undefined;
  return { isOrdered: false, components, full: "" } as ContactCardCreate["name"];
}

function buildPhonesFromDraft(
  rows: ContactEditDraft["phones"],
): NonNullable<ContactCardCreate["phones"]> {
  const phones: NonNullable<ContactCardCreate["phones"]> = {};
  for (const row of rows) {
    const number = row.number.trim();
    if (!number) continue;
    const entry: Record<string, unknown> = { number };
    const contexts = contactContextToPatch(row.contextType);
    if (contexts) entry.contexts = contexts;
    phones[row.id] = entry as NonNullable<ContactCardCreate["phones"]>[string];
  }
  return phones;
}

function buildEmailsFromDraft(
  rows: ContactEditDraft["emails"],
): NonNullable<ContactCardCreate["emails"]> {
  const emails: NonNullable<ContactCardCreate["emails"]> = {};
  for (const row of rows) {
    const address = row.address.trim();
    if (!address) continue;
    const entry: Record<string, unknown> = { address };
    const contexts = contactContextToPatch(row.contextType);
    if (contexts) entry.contexts = contexts;
    emails[row.id] = entry as NonNullable<ContactCardCreate["emails"]>[string];
  }
  return emails;
}

function buildAddressesFromDraft(
  rows: ContactEditDraft["addresses"],
): NonNullable<ContactCardCreate["addresses"]> {
  const addresses: NonNullable<ContactCardCreate["addresses"]> = {};
  for (const row of rows) {
    const full = row.full.trim();
    if (!full) continue;
    const entry: Record<string, unknown> = { full };
    const contexts = contactContextToPatch(row.contextType);
    if (contexts) entry.contexts = contexts;
    addresses[row.id] = entry as NonNullable<ContactCardCreate["addresses"]>[string];
  }
  return addresses;
}

export function editDraftToCreateBody(
  draft: ContactEditDraft,
  addressBookIds: Record<string, true>,
): ContactCardCreate {
  const body: ContactCardCreate = {
    addressBookIds,
    kind: "individual",
  };

  const name = buildNameFromDraft(draft);
  if (name) body.name = name;

  const phones = buildPhonesFromDraft(draft.phones);
  if (Object.keys(phones).length > 0) body.phones = phones;

  const emails = buildEmailsFromDraft(draft.emails);
  if (Object.keys(emails).length > 0) body.emails = emails;

  const addresses = buildAddressesFromDraft(draft.addresses);
  if (Object.keys(addresses).length > 0) body.addresses = addresses;

  if (draft.organization.trim()) {
    body.organizations = {
      [draft.organizationId ?? newContactMapId()]: { name: draft.organization.trim() },
    } as ContactCardCreate["organizations"];
  }

  if (draft.notes.trim()) {
    body.notes = {
      [draft.notesId ?? newContactMapId()]: { note: draft.notes.trim() },
    } as ContactCardCreate["notes"];
  }

  return body;
}

function currentNameComponents(card: ContactCard): {
  given: string;
  given2: string;
  surname: string;
  full: string;
} {
  const components = card.name?.components ?? [];
  return {
    given: componentValue(components, "given"),
    given2: componentValue(components, "given2"),
    surname: componentValue(components, "surname"),
    full: card.name?.full?.trim() ?? "",
  };
}

function patchName(
  draft: ContactEditDraft,
  active: ContactCard,
): ContactCardPatch["name"] | undefined {
  const next = buildNameFromDraft(draft);
  const current = currentNameComponents(active);

  const draftGiven = draft.nameGiven.trim();
  const draftGiven2 = draft.nameGiven2.trim();
  const draftSurname = draft.nameSurname.trim();

  if (!next && !current.given && !current.given2 && !current.surname && !current.full) {
    return undefined;
  }

  const componentsChanged =
    current.given !== draftGiven ||
    current.given2 !== draftGiven2 ||
    current.surname !== draftSurname;

  if (!componentsChanged && !current.full) return undefined;

  if (!componentsChanged && current.full) {
    const split = splitFullName(current.full);
    if (split.given === draftGiven && split.surname === draftSurname && !draftGiven2) {
      return undefined;
    }
  }

  return next ?? ({ full: "" } as ContactCardPatch["name"]);
}

function patchChannelMapField<
  T extends Record<string, unknown | null>,
  Row extends { id: string; contextType: ContactChannelContext },
>(
  activeIds: Set<string>,
  draftRows: Row[],
  readRow: (id: string) => { value: string; contextType: ContactChannelContext },
  getValue: (row: Row) => string,
  toPatchValue: (row: Row) => unknown,
): T | undefined {
  const patch = {} as T;
  let changed = false;

  for (const id of activeIds) {
    if (!draftRows.some((row) => row.id === id)) {
      (patch as Record<string, unknown | null>)[id] = null;
      changed = true;
    }
  }

  for (const row of draftRows) {
    const value = getValue(row).trim();
    if (!value) {
      if (activeIds.has(row.id)) {
        (patch as Record<string, unknown | null>)[row.id] = null;
        changed = true;
      }
      continue;
    }
    const current = readRow(row.id);
    if (current.value !== value || current.contextType !== row.contextType) {
      (patch as Record<string, unknown>)[row.id] = toPatchValue(row);
      changed = true;
    }
  }

  return changed ? patch : undefined;
}

export function editDraftToPatch(draft: ContactEditDraft, active: ContactCard): ContactCardPatch {
  const patch: ContactCardPatch = {};

  const name = patchName(draft, active);
  if (name) patch.name = name;

  const activePhoneIds = new Set(mapEntriesSorted(active.phones).map(([id]) => id));
  const phones = patchChannelMapField<
    NonNullable<ContactCardPatch["phones"]>,
    ContactEditDraft["phones"][number]
  >(
    activePhoneIds,
    draft.phones,
    (id) => {
      const phone = phoneValue(active, id);
      return { value: phone.number, contextType: phone.contextType };
    },
    (row) => row.number,
    (row) => {
      const entry: Record<string, unknown> = { number: row.number.trim() };
      const contexts = contactContextToPatch(row.contextType);
      if (contexts) entry.contexts = contexts;
      return entry;
    },
  );
  if (phones) patch.phones = phones;

  const activeEmailIds = new Set(mapEntriesSorted(active.emails).map(([id]) => id));
  const emails = patchChannelMapField<
    NonNullable<ContactCardPatch["emails"]>,
    ContactEditDraft["emails"][number]
  >(
    activeEmailIds,
    draft.emails,
    (id) => {
      const email = emailValue(active, id);
      return { value: email.address, contextType: email.contextType };
    },
    (row) => row.address,
    (row) => {
      const entry: Record<string, unknown> = { address: row.address.trim() };
      const contexts = contactContextToPatch(row.contextType);
      if (contexts) entry.contexts = contexts;
      return entry;
    },
  );
  if (emails) patch.emails = emails;

  const activeAddressIds = new Set(mapEntriesSorted(active.addresses).map(([id]) => id));
  const addresses = patchChannelMapField<
    NonNullable<ContactCardPatch["addresses"]>,
    ContactEditDraft["addresses"][number]
  >(
    activeAddressIds,
    draft.addresses,
    (id) => {
      const address = addressValue(active, id);
      return { value: address.full, contextType: address.contextType };
    },
    (row) => row.full,
    (row) => {
      const entry: Record<string, unknown> = { full: row.full.trim() };
      const contexts = contactContextToPatch(row.contextType);
      if (contexts) entry.contexts = contexts;
      return entry;
    },
  );
  if (addresses) patch.addresses = addresses;

  const [activeOrgId, activeOrg] = mapEntriesSorted(active.organizations)[0] ?? [];
  const orgName = draft.organization.trim();
  const currentOrgName = activeOrg?.name?.trim() ?? "";
  if (orgName !== currentOrgName) {
    if (!orgName && activeOrgId) {
      patch.organizations = { [activeOrgId]: null } as unknown as ContactCardPatch["organizations"];
    } else if (orgName) {
      patch.organizations = {
        [draft.organizationId ?? activeOrgId ?? newContactMapId()]: { name: orgName },
      } as ContactCardPatch["organizations"];
    }
  }

  const [activeNoteId, activeNote] = mapEntriesSorted(active.notes)[0] ?? [];
  const noteText = draft.notes.trim();
  const currentNoteText = activeNote?.note?.trim() ?? "";
  if (noteText !== currentNoteText) {
    if (!noteText && activeNoteId) {
      patch.notes = { [activeNoteId]: null } as unknown as ContactCardPatch["notes"];
    } else if (noteText) {
      patch.notes = {
        [draft.notesId ?? activeNoteId ?? newContactMapId()]: { note: noteText },
      } as ContactCardPatch["notes"];
    }
  }

  return patch;
}

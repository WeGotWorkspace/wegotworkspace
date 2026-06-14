import { mapEntriesSorted } from "@/contacts-core/src/contacts-display-utils";
import type {
  AddressBook,
  ContactCard,
  ContactCardCreate,
  ContactCardPatch,
} from "@/contacts-core/src/contacts-types";

export const CONTACTS_CREATE_ID = "__contacts_create__";

export type ContactEditDraft = {
  useComponentName: boolean;
  nameFull: string;
  nameGiven: string;
  nameSurname: string;
  phones: Array<{ id: string; number: string }>;
  emails: Array<{ id: string; address: string }>;
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
    useComponentName: false,
    nameFull: "",
    nameGiven: "",
    nameSurname: "",
    phones: [],
    emails: [],
    organization: "",
    notes: "",
  };
}

function readPhoneNumber(phone: NonNullable<ContactCard["phones"]>[string]): string {
  if (typeof phone.number === "string") return phone.number.trim();
  if (typeof phone.uri === "string") return phone.uri.trim();
  return "";
}

function phoneValue(card: ContactCard, id: string): string {
  const phone = card.phones?.[id];
  if (!phone) return "";
  return readPhoneNumber(phone);
}

function emailValue(card: ContactCard, id: string): string {
  return card.emails?.[id]?.address?.trim() ?? "";
}

export function contactCardToEditDraft(card: ContactCard): ContactEditDraft {
  const hasComponents = Boolean(card.name?.components?.length);
  const fullName = card.name?.full?.trim() ?? "";
  const given = (card.name?.components ?? [])
    .filter((component) => component.kind === "given" || component.kind === "given2")
    .map((component) => component.value.trim())
    .filter(Boolean)
    .join(" ");
  const surname = (card.name?.components ?? [])
    .filter((component) => component.kind === "surname" || component.kind === "surname2")
    .map((component) => component.value.trim())
    .filter(Boolean)
    .join(" ");

  const [organizationId, organizationEntry] = mapEntriesSorted(card.organizations)[0] ?? [];
  const [notesId, notesEntry] = mapEntriesSorted(card.notes)[0] ?? [];

  return {
    useComponentName: hasComponents && !fullName,
    nameFull: fullName,
    nameGiven: given,
    nameSurname: surname,
    phones: mapEntriesSorted(card.phones).map(([id, phone]) => ({
      id,
      number: readPhoneNumber(phone),
    })),
    emails: mapEntriesSorted(card.emails).map(([id, email]) => ({
      id,
      address: email.address?.trim() ?? "",
    })),
    organization: organizationEntry?.name?.trim() ?? "",
    organizationId,
    notes: notesEntry?.note?.trim() ?? "",
    notesId,
  };
}

function buildNameFromDraft(draft: ContactEditDraft): ContactCardCreate["name"] | undefined {
  if (draft.useComponentName) {
    const components = [];
    if (draft.nameGiven.trim()) {
      components.push({ kind: "given" as const, value: draft.nameGiven.trim() });
    }
    if (draft.nameSurname.trim()) {
      components.push({ kind: "surname" as const, value: draft.nameSurname.trim() });
    }
    if (components.length === 0) return undefined;
    return { isOrdered: false, components } as ContactCardCreate["name"];
  }
  if (!draft.nameFull.trim()) return undefined;
  return { full: draft.nameFull.trim() } as ContactCardCreate["name"];
}

function buildPhonesFromDraft(
  rows: ContactEditDraft["phones"],
): NonNullable<ContactCardCreate["phones"]> {
  const phones: NonNullable<ContactCardCreate["phones"]> = {};
  for (const row of rows) {
    const number = row.number.trim();
    if (!number) continue;
    phones[row.id] = { number } as NonNullable<ContactCardCreate["phones"]>[string];
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
    emails[row.id] = { address } as NonNullable<ContactCardCreate["emails"]>[string];
  }
  return emails;
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

function patchName(
  draft: ContactEditDraft,
  active: ContactCard,
): ContactCardPatch["name"] | undefined {
  const next = buildNameFromDraft(draft);
  const current = active.name;
  if (!next && !current) return undefined;

  if (draft.useComponentName) {
    const currentGiven = (current?.components ?? [])
      .filter((component) => component.kind === "given" || component.kind === "given2")
      .map((component) => component.value.trim())
      .join(" ");
    const currentSurname = (current?.components ?? [])
      .filter((component) => component.kind === "surname" || component.kind === "surname2")
      .map((component) => component.value.trim())
      .join(" ");
    if (
      currentGiven === draft.nameGiven.trim() &&
      currentSurname === draft.nameSurname.trim() &&
      !current?.full?.trim()
    ) {
      return undefined;
    }
    return next;
  }

  if ((current?.full?.trim() ?? "") === draft.nameFull.trim()) return undefined;
  return next;
}

function patchMapField<T extends Record<string, unknown | null>>(
  activeIds: Set<string>,
  draftRows: Array<{ id: string; value: string }>,
  readValue: (id: string) => string,
  toPatchValue: (value: string) => unknown,
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
    const value = row.value.trim();
    if (!value) {
      if (activeIds.has(row.id)) {
        (patch as Record<string, unknown | null>)[row.id] = null;
        changed = true;
      }
      continue;
    }
    if (readValue(row.id) !== value) {
      (patch as Record<string, unknown>)[row.id] = toPatchValue(value);
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
  const phones = patchMapField<NonNullable<ContactCardPatch["phones"]>>(
    activePhoneIds,
    draft.phones.map((row) => ({ id: row.id, value: row.number })),
    (id) => phoneValue(active, id),
    (value) => ({ number: value }),
  );
  if (phones) patch.phones = phones;

  const activeEmailIds = new Set(mapEntriesSorted(active.emails).map(([id]) => id));
  const emails = patchMapField<NonNullable<ContactCardPatch["emails"]>>(
    activeEmailIds,
    draft.emails.map((row) => ({ id: row.id, value: row.address })),
    (id) => emailValue(active, id),
    (value) => ({ address: value }),
  );
  if (emails) patch.emails = emails;

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

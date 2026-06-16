import type {
  AddressBook,
  ContactAddressBookListResponse,
  ContactCard,
  ContactCardCreate,
  ContactCardImportResponse,
  ContactCardListResponse,
  ContactCardPatch,
} from "@wgw-api-generated/contacts-types";
import type { ContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { wgwFetch, wgwFetchPrincipal, wgwReadJson } from "@/lib/api/wgw/http";

export class ContactsRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ContactsRequestOpts = {
  signal?: AbortSignal;
  /** CardDAV etag from ContactCard — required for PATCH/DELETE per optimistic concurrency. */
  ifMatch?: string;
};

function parseAddressBooksPayload(json: unknown): AddressBook[] {
  if (!json || typeof json !== "object") return [];
  const payload = json as ContactAddressBookListResponse | Record<string, unknown>;
  const list = "list" in payload && Array.isArray(payload.list) ? payload.list : [];
  return list as AddressBook[];
}

function parseCardsPayload(json: unknown): ContactCard[] {
  if (!json || typeof json !== "object") return [];
  const payload = json as ContactCardListResponse | Record<string, unknown>;
  const list = "list" in payload && Array.isArray(payload.list) ? payload.list : [];
  return list as ContactCard[];
}

async function requestContactsJson(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  opts?: ContactsRequestOpts,
): Promise<unknown> {
  const headers = new Headers();
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (opts?.ifMatch) {
    headers.set("If-Match", opts.ifMatch);
  }

  const init: RequestInit = { method, signal: opts?.signal, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await wgwFetch(path, init);
  if (!res.ok) {
    throw new ContactsRequestError(`${method} ${path} failed (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined;
  return wgwReadJson(res);
}

export async function listAddressBooks(opts?: { signal?: AbortSignal }): Promise<AddressBook[]> {
  const json = await requestContactsJson("/contacts/addressbooks", "GET", undefined, opts);
  return parseAddressBooksPayload(json);
}

export async function listCards(opts?: {
  addressBookId?: string;
  signal?: AbortSignal;
}): Promise<ContactCard[]> {
  if (opts?.addressBookId) {
    const query = `?addressBookId=${encodeURIComponent(opts.addressBookId)}`;
    const json = await requestContactsJson(`/contacts/cards${query}`, "GET", undefined, opts);
    return parseCardsPayload(json);
  }

  const books = await listAddressBooks(opts);
  if (books.length === 0) return [];

  const lists = await Promise.all(
    books.map((book) => listCards({ addressBookId: book.id, signal: opts?.signal })),
  );
  const byId = new Map<string, ContactCard>();
  for (const cards of lists) {
    for (const card of cards) {
      byId.set(card.id, card);
    }
  }
  return [...byId.values()];
}

export async function getCard(
  cardId: string,
  opts?: { signal?: AbortSignal },
): Promise<ContactCard> {
  const json = await requestContactsJson(
    `/contacts/cards/${encodeURIComponent(cardId)}`,
    "GET",
    undefined,
    opts,
  );
  return json as ContactCard;
}

export async function createCard(
  body: ContactCardCreate,
  opts?: { signal?: AbortSignal },
): Promise<ContactCard> {
  const json = await requestContactsJson("/contacts/cards", "POST", body, opts);
  return json as ContactCard;
}

export async function patchCard(
  cardId: string,
  patch: ContactCardPatch,
  opts?: ContactsRequestOpts,
): Promise<ContactCard> {
  const json = await requestContactsJson(
    `/contacts/cards/${encodeURIComponent(cardId)}`,
    "PATCH",
    patch,
    opts,
  );
  return json as ContactCard;
}

export async function deleteCard(cardId: string, opts?: ContactsRequestOpts): Promise<void> {
  await requestContactsJson(
    `/contacts/cards/${encodeURIComponent(cardId)}`,
    "DELETE",
    undefined,
    opts,
  );
}

/**
 * Fetch the raw vCard bytes for a single contact card from the server.
 * Returns the raw vCard text as a string (UTF-8).
 */
export async function downloadCardVcf(
  cardId: string,
  opts?: { signal?: AbortSignal },
): Promise<string> {
  const res = await wgwFetch(`/contacts/cards/${encodeURIComponent(cardId)}/vcf`, {
    method: "GET",
    signal: opts?.signal,
  });
  if (!res.ok) {
    throw new ContactsRequestError(
      `GET /contacts/cards/${cardId}/vcf failed (${res.status})`,
      res.status,
    );
  }
  return res.text();
}

export async function importVcards(
  vcardText: string,
  opts: { addressBookId: string; signal?: AbortSignal },
): Promise<ContactCardImportResponse> {
  const query = `?addressBookId=${encodeURIComponent(opts.addressBookId)}`;
  const res = await wgwFetch(`/contacts/cards/import${query}`, {
    method: "POST",
    headers: { "Content-Type": "text/vcard" },
    body: vcardText,
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new ContactsRequestError(
      `POST /contacts/cards/import failed (${res.status})`,
      res.status,
    );
  }
  return (await wgwReadJson(res)) as ContactCardImportResponse;
}

/** Load address books and cards from the configured WeGotWorkspace API. */
export async function fetchContactsLiveBootstrap(): Promise<ContactsAppBootstrap> {
  const session = await wgwFetchPrincipal();

  const settingsRes = await wgwFetch("/settings/state");
  if (settingsRes.ok) {
    const settings = (await wgwReadJson(settingsRes)) as {
      apps?: { contacts?: boolean };
    };
    if (settings.apps?.contacts === false) {
      throw new Error("CONTACTS_SETTINGS_MISSING");
    }
  }

  const addressBooks = await listAddressBooks();
  const cards = await listCards();

  return {
    data: { addressBooks, cards },
    session,
  };
}

import type {
  AddressBook,
  ContactCard,
  ContactCardCreate,
  ContactCardPatch,
} from "@wgw-api-generated/contacts-types";

export type { AddressBook, ContactCard, ContactCardCreate, ContactCardPatch };

export type ContactsUIData = {
  addressBooks: AddressBook[];
  cards: ContactCard[];
};

export type ContactsMutationOpts = {
  signal?: AbortSignal;
  /** CardDAV etag from ContactCard — required for PATCH/DELETE against the live API. */
  ifMatch?: string;
};

/**
 * Backend-agnostic contacts operations consumed by contacts UI/controller.
 * Implement this for any provider (WGW, custom API, local-only, etc).
 */
export type ContactsAPIOperations = {
  listAddressBooks: (opts?: { signal?: AbortSignal }) => Promise<AddressBook[]>;
  listCards: (opts?: { addressBookId?: string; signal?: AbortSignal }) => Promise<ContactCard[]>;
  getCard: (cardId: string, opts?: { signal?: AbortSignal }) => Promise<ContactCard>;
  createCard: (body: ContactCardCreate, opts?: { signal?: AbortSignal }) => Promise<ContactCard>;
  patchCard: (
    cardId: string,
    patch: ContactCardPatch,
    opts?: ContactsMutationOpts,
  ) => Promise<ContactCard>;
  deleteCard: (cardId: string, opts?: ContactsMutationOpts) => Promise<void>;
  /**
   * Fetch the raw vCard bytes (text/vcard) for a single card from the server.
   * When absent, the controller falls back to client-side conversion from JSContact.
   */
  downloadCardVcf?: (cardId: string, opts?: { signal?: AbortSignal }) => Promise<string>;
};

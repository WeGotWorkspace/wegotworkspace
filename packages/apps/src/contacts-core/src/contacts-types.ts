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
    opts?: { signal?: AbortSignal },
  ) => Promise<ContactCard>;
  deleteCard: (cardId: string, opts?: { signal?: AbortSignal }) => Promise<void>;
};

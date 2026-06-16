import type {
  AddressBook,
  ContactCard,
  ContactCardCreate,
  ContactCardPatch,
} from "@/contacts-core/src/contacts-types";
import type { ContactsAPIOperations, ContactsUIData } from "@/contacts-core/src/contacts-types";
import {
  contactCardToEditDraft,
  editDraftToPatch,
  newContactMapId,
} from "@/contacts-core/src/contacts-edit-utils";

type ContactsMockStore = {
  addressBooks: AddressBook[];
  cards: ContactCard[];
};

export type ContactsMockOperationsOptions = {
  initialData: ContactsUIData;
  onPatchCard?: (cardId: string, patch: ContactCardPatch) => void;
  onCreateCard?: (body: ContactCardCreate) => void;
};

function cloneStore(data: ContactsUIData): ContactsMockStore {
  return {
    addressBooks: structuredClone(data.addressBooks),
    cards: structuredClone(data.cards),
  };
}

export function createContactsMockOperations(
  options: ContactsMockOperationsOptions,
): ContactsAPIOperations {
  const store = cloneStore(options.initialData);

  return {
    listAddressBooks: async () => structuredClone(store.addressBooks),
    listCards: async (opts) => {
      if (!opts?.addressBookId) return structuredClone(store.cards);
      return store.cards.filter((card) => Boolean(card.addressBookIds?.[opts.addressBookId!]));
    },
    getCard: async (cardId) => {
      const card = store.cards.find((row) => row.id === cardId);
      if (!card) throw new Error(`Contact ${cardId} not found`);
      return structuredClone(card);
    },
    createCard: async (body) => {
      options.onCreateCard?.(body);
      const created: ContactCard = {
        "@type": "Card",
        version: "1.0",
        id: `card-${newContactMapId()}`,
        uid: `urn:uuid:${newContactMapId()}`,
        ...body,
      };
      store.cards.unshift(created);
      return structuredClone(created);
    },
    patchCard: async (cardId, patch) => {
      options.onPatchCard?.(cardId, patch);
      const index = store.cards.findIndex((row) => row.id === cardId);
      if (index === -1) throw new Error(`Contact ${cardId} not found`);
      const current = store.cards[index];
      const merged: ContactCard = {
        ...current,
        ...patch,
        name: patch.name ?? current.name,
        phones: { ...current.phones, ...patch.phones },
        emails: { ...current.emails, ...patch.emails },
        organizations: { ...current.organizations, ...patch.organizations },
        notes: { ...current.notes, ...patch.notes },
      };
      for (const [key, value] of Object.entries(patch.phones ?? {})) {
        if (value === null) delete merged.phones?.[key];
      }
      for (const [key, value] of Object.entries(patch.emails ?? {})) {
        if (value === null) delete merged.emails?.[key];
      }
      for (const [key, value] of Object.entries(patch.organizations ?? {})) {
        if (value === null) delete merged.organizations?.[key];
      }
      for (const [key, value] of Object.entries(patch.notes ?? {})) {
        if (value === null) delete merged.notes?.[key];
      }
      store.cards[index] = merged;
      return structuredClone(merged);
    },
    deleteCard: async (cardId) => {
      store.cards = store.cards.filter((row) => row.id !== cardId);
    },
  };
}

export function buildPatchFromDraft(card: ContactCard) {
  return editDraftToPatch(contactCardToEditDraft(card), card);
}

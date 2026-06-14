import {
  createContactsAppBootstrap,
  type ContactsAppBootstrap,
} from "@/lib/api/mock/contacts-bootstrap";
import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import {
  createCard,
  deleteCard,
  fetchContactsLiveBootstrap,
  getCard,
  listAddressBooks,
  listCards,
  patchCard,
} from "@/lib/api/wgw/contacts";
import type { ContactsAPIOperations } from "@/contacts-core/src/contacts-types";

export type ContactsApiSource = {
  loadBootstrap: () => Promise<ContactsAppBootstrap>;
  createOperations: () => ContactsAPIOperations | undefined;
};

function createWgwOperations(): ContactsAPIOperations {
  return {
    listAddressBooks,
    listCards,
    getCard,
    createCard,
    patchCard,
    deleteCard,
  };
}

export function createWgwContactsApiSource(): ContactsApiSource {
  return {
    loadBootstrap: fetchContactsLiveBootstrap,
    createOperations: () => createWgwOperations(),
  };
}

export function createDefaultContactsApiSource(): ContactsApiSource {
  return createWorkspaceSource<ContactsApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createContactsAppBootstrap()),
      createOperations: () => undefined,
    }),
    createLiveSource: createWgwContactsApiSource,
  });
}

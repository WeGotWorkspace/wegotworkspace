export { useContactsAPI } from "./use-contacts-api";
export { createDefaultContactsApiSource } from "./contacts-api-source";
export type { ContactsApiSource } from "./contacts-api-source";
export type {
  ContactsUIData,
  ContactsAPIOperations,
  AddressBook,
  ContactCard,
  ContactCardCreate,
  ContactCardPatch,
} from "./contacts-types";
export {
  contactDisplayName,
  contactInitials,
  contactListSubtitle,
  filterCardsBySearch,
  mapEntriesSorted,
} from "./contacts-display-utils";

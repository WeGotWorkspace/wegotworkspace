import { workspaceDestructiveDialogLabels } from "@/lib/workspace/destructive-dialog";

/**
 * User-visible copy for the contacts workspace (sidebar, list chrome, dialogs, toasts).
 * Override via {@link ContactsWorkspaceProps.labels} in stories/tests.
 */
export type ContactsUILabels = {
  listLoading: string;
  searchPlaceholder: string;
  sidebarAllContacts: string;
  sectionAddressBooks: string;
  sectionGroups: string;
  listSelected: (count: number) => string;
  listContacts: (count: number) => string;
  emptyList: string;
  emptyGroupMembers: string;
  renameGroup: string;
  toastGroupRenamed: (name: string) => string;
  newContact: string;
  unknownContact: string;
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  sectionName: string;
  sectionPhones: string;
  sectionEmails: string;
  sectionAddresses: string;
  sectionOrganization: string;
  sectionNotes: string;
  sectionUrls: string;
  companyContact: string;
  nameFull: string;
  nameGiven: string;
  nameGiven2: string;
  nameSurname: string;
  channelType: string;
  channelTypeNone: string;
  channelTypeHome: string;
  channelTypeWork: string;
  channelTypeSchool: string;
  phoneNumber: string;
  emailAddress: string;
  organizationName: string;
  notesText: string;
  addPhone: string;
  addEmail: string;
  addAddress: string;
  addUrl: string;
  urlAddress: string;
  addressStreet: string;
  addressLocality: string;
  addressRegion: string;
  addressPostalCode: string;
  addressCountry: string;
  addressLine: string;
  removeRow: string;
  toastCreated: string;
  toastSaved: string;
  toastDeleted: string;
  selectionDelete: string;
  selectionDone: string;
  deleteContactTitle: string;
  deleteContactDescription: (count: number) => string;
  deleteConfirm: string;
  deleteCancel: string;
};

export const defaultContactsLabels: ContactsUILabels = {
  listLoading: "Loading contacts…",
  searchPlaceholder: "Search contacts...",
  sidebarAllContacts: "All contacts",
  sectionAddressBooks: "Address books",
  sectionGroups: "Groups",
  listSelected: (count) => `${count} Selected`,
  listContacts: (count) => `${count} Contacts`,
  emptyList: "No contacts",
  emptyGroupMembers: "No members in this group",
  renameGroup: "Rename group",
  toastGroupRenamed: (name) => `Renamed to “${name}”`,
  newContact: "New contact",
  unknownContact: "Unknown contact",
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  sectionName: "Name",
  sectionPhones: "Phones",
  sectionEmails: "Emails",
  sectionAddresses: "Addresses",
  sectionOrganization: "Organization",
  sectionNotes: "Notes",
  sectionUrls: "URLs",
  companyContact: "Company contact",
  nameFull: "Full name",
  nameGiven: "First name",
  nameGiven2: "Middle name",
  nameSurname: "Last name",
  channelType: "Type",
  channelTypeNone: "Other",
  channelTypeHome: "Home",
  channelTypeWork: "Work",
  channelTypeSchool: "School",
  phoneNumber: "Phone number",
  emailAddress: "Email address",
  organizationName: "Organization",
  notesText: "Notes",
  addPhone: "Add phone",
  addEmail: "Add email",
  addAddress: "Add address",
  addUrl: "Add URL",
  urlAddress: "URL",
  addressStreet: "Street",
  addressLocality: "City / locality",
  addressRegion: "State / region",
  addressPostalCode: "Postal code",
  addressCountry: "Country",
  addressLine: "Street address",
  removeRow: "Remove",
  toastCreated: "Contact created",
  toastSaved: "Contact saved",
  toastDeleted: "Contact deleted",
  selectionDelete: "Delete",
  selectionDone: "Done",
  deleteContactTitle: "Delete contact?",
  deleteContactDescription: (count) =>
    `This will permanently delete ${count} contact${count === 1 ? "" : "s"}.`,
  deleteConfirm: workspaceDestructiveDialogLabels.dialogDelete,
  deleteCancel: workspaceDestructiveDialogLabels.dialogCancel,
};

export function mergeContactsLabels(overrides?: Partial<ContactsUILabels>): ContactsUILabels {
  if (!overrides) return defaultContactsLabels;
  return { ...defaultContactsLabels, ...overrides };
}

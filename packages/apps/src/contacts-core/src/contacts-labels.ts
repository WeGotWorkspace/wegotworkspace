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
  listSelected: (count: number) => string;
  listContacts: (count: number) => string;
  emptyList: string;
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
  nameFull: string;
  nameGiven: string;
  nameGiven2: string;
  nameSurname: string;
  channelType: string;
  channelTypeNone: string;
  channelTypeHome: string;
  channelTypeWork: string;
  phoneNumber: string;
  emailAddress: string;
  organizationName: string;
  notesText: string;
  addPhone: string;
  addEmail: string;
  addAddress: string;
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
  listSelected: (count) => `${count} Selected`,
  listContacts: (count) => `${count} Contacts`,
  emptyList: "No contacts",
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
  nameFull: "Full name",
  nameGiven: "First name",
  nameGiven2: "Middle name",
  nameSurname: "Last name",
  channelType: "Type",
  channelTypeNone: "Other",
  channelTypeHome: "Home",
  channelTypeWork: "Work",
  phoneNumber: "Phone number",
  emailAddress: "Email address",
  organizationName: "Organization",
  notesText: "Notes",
  addPhone: "Add phone",
  addEmail: "Add email",
  addAddress: "Add address",
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

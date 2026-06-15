import { useMemo } from "react";
import { BookUser, Users, UsersRound } from "lucide-react";
import { contactDisplayName } from "@/contacts-core/src/contacts-display-utils";
import { contactsGroupViewKey } from "@/contacts-core/src/contacts-group-utils";
import type { AddressBook, ContactCard } from "@/contacts-core/src/contacts-types";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

type UseContactsSidebarModelArgs = {
  labels: ContactsUILabels;
  view: string;
  addressBooks: AddressBook[];
  contactGroups: ContactCard[];
  selectView: (view: string) => void;
};

export function useContactsSidebarModel({
  labels,
  view,
  addressBooks,
  contactGroups,
  selectView,
}: UseContactsSidebarModelArgs) {
  const primarySidebarItems = useMemo(
    () => [
      {
        label: labels.sidebarAllContacts,
        icon: <Users className="size-3.5" />,
        selected: view === "all",
        onClick: () => selectView("all"),
      },
    ],
    [labels.sidebarAllContacts, selectView, view],
  );

  const addressBookSidebarItems = useMemo(
    () =>
      addressBooks.map((book) => ({
        label: book.name,
        icon: <BookUser className="size-3.5" />,
        selected: view === `book:${book.id}`,
        onClick: () => selectView(`book:${book.id}`),
      })),
    [addressBooks, selectView, view],
  );

  const groupSidebarItems = useMemo(
    () =>
      contactGroups.map((group) => ({
        label: contactDisplayName(group),
        icon: <UsersRound className="size-3.5" />,
        selected: view === contactsGroupViewKey(group.id),
        onClick: () => selectView(contactsGroupViewKey(group.id)),
      })),
    [contactGroups, selectView, view],
  );

  return {
    primarySidebarItems,
    addressBookSidebarItems,
    groupSidebarItems,
  };
}

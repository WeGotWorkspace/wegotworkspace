import { useMemo } from "react";
import { BookUser, Users } from "lucide-react";
import type { AddressBook } from "@/contacts-core/src/contacts-types";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

type UseContactsSidebarModelArgs = {
  labels: ContactsUILabels;
  view: string;
  addressBooks: AddressBook[];
  selectView: (view: string) => void;
};

export function useContactsSidebarModel({
  labels,
  view,
  addressBooks,
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

  return {
    primarySidebarItems,
    addressBookSidebarItems,
  };
}

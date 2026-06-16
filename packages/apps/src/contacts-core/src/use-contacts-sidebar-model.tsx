import { useMemo } from "react";
import { Users, UsersRound } from "lucide-react";
import { contactDisplayName } from "@/contacts-core/src/contacts-display-utils";
import { contactsGroupViewKey } from "@/contacts-core/src/contacts-group-utils";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

type UseContactsSidebarModelArgs = {
  labels: ContactsUILabels;
  view: string;
  contactGroups: ContactCard[];
  selectView: (view: string) => void;
  sidebarDropZoneProps: (
    targetKey: string,
    onDrop: (ids: string[]) => void,
  ) => Record<string, unknown>;
  addMembersToGroup: (groupId: string, cardIds: string[]) => void;
};

export function useContactsSidebarModel({
  labels,
  view,
  contactGroups,
  selectView,
  sidebarDropZoneProps,
  addMembersToGroup,
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

  const groupSidebarItems = useMemo(
    () =>
      contactGroups.map((group) => ({
        label: contactDisplayName(group),
        icon: <UsersRound className="size-3.5" />,
        selected: view === contactsGroupViewKey(group.id),
        onClick: () => selectView(contactsGroupViewKey(group.id)),
        ...sidebarDropZoneProps(contactsGroupViewKey(group.id), (ids) =>
          addMembersToGroup(group.id, ids),
        ),
      })),
    [addMembersToGroup, contactGroups, selectView, sidebarDropZoneProps, view],
  );

  return {
    primarySidebarItems,
    groupSidebarItems,
  };
}

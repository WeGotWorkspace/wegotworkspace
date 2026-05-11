import { useMemo } from "react";
import { Inbox as InboxIcon, Star } from "lucide-react";
import type { MailUILabels } from "./mail-app.stories.fixtures";
import { mailboxIconForLabel } from "./mailbox-icons";

type UseMailSidebarModelArgs = {
  labels: MailUILabels;
  view: string;
  secondarySystemMailboxes: readonly string[];
  moreMailboxes: readonly string[];
  mailboxView: (mailbox: string) => string;
  selectView: (view: string) => void;
  sidebarUnreadBadge: (mailboxLabel: string) => number | undefined;
  sidebarDropZoneProps: (
    target: string,
    onDrop: (ids: string[]) => void,
  ) => Record<string, unknown>;
  moveToMailbox: (ids: string[], mailbox: string) => void;
};

export function useMailSidebarModel({
  labels,
  view,
  secondarySystemMailboxes,
  moreMailboxes,
  mailboxView,
  selectView,
  sidebarUnreadBadge,
  sidebarDropZoneProps,
  moveToMailbox,
}: UseMailSidebarModelArgs) {
  const primarySidebarItems = useMemo(
    () => [
      {
        label: labels.sidebarInbox,
        selected: view === mailboxView("Inbox"),
        onClick: () => selectView(mailboxView("Inbox")),
        icon: <InboxIcon className="size-3.5" />,
        badge: sidebarUnreadBadge("Inbox"),
      },
      {
        label: labels.sidebarStarred,
        selected: view === mailboxView("Starred"),
        onClick: () => selectView(mailboxView("Starred")),
        icon: <Star className="size-3.5" />,
        badge: sidebarUnreadBadge("Starred"),
      },
    ],
    [labels.sidebarInbox, labels.sidebarStarred, mailboxView, selectView, sidebarUnreadBadge, view],
  );

  const systemSidebarItems = useMemo(
    () =>
      secondarySystemMailboxes.map((mailbox) => ({
        label: mailbox,
        selected: view === mailboxView(mailbox),
        onClick: () => selectView(mailboxView(mailbox)),
        icon: mailboxIconForLabel(mailbox),
        badge: sidebarUnreadBadge(mailbox),
        ...sidebarDropZoneProps(mailboxView(mailbox), (ids) => moveToMailbox(ids, mailbox)),
      })),
    [
      secondarySystemMailboxes,
      view,
      mailboxView,
      selectView,
      sidebarUnreadBadge,
      sidebarDropZoneProps,
      moveToMailbox,
    ],
  );

  const moreSidebarItems = useMemo(
    () =>
      moreMailboxes.map((mailbox) => ({
        label: mailbox,
        selected: view === mailboxView(mailbox),
        onClick: () => selectView(mailboxView(mailbox)),
        icon: mailboxIconForLabel(mailbox),
        badge: sidebarUnreadBadge(mailbox),
        ...sidebarDropZoneProps(mailboxView(mailbox), (ids) => moveToMailbox(ids, mailbox)),
      })),
    [
      moreMailboxes,
      view,
      mailboxView,
      selectView,
      sidebarUnreadBadge,
      sidebarDropZoneProps,
      moveToMailbox,
    ],
  );

  return {
    primarySidebarItems,
    systemSidebarItems,
    moreSidebarItems,
  };
}

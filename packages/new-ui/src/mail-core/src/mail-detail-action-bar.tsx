import type { ReactNode } from "react";
import { Forward, MoreHorizontal, Reply, ReplyAll } from "lucide-react";
import { ToolbarButton } from "@/action-buttons/src/action-buttons";
import { ActionBar } from "@/action-bar/src/action-bar";
import { MenuDropdown } from "@/menu-dropdown/src/menu-dropdown";
import type { MenuDropdownItemProps } from "@/menu-dropdown/src/menu-dropdown";
import type { Mail } from "@/types/mail";
import { buildMailActionButtons } from "@/mail-core/src/mail-action-buttons";

type MailDetailActionBarProps = {
  active: Mail | undefined;
  closeMobileDetail: () => void;
  show: (title: string, opts: { icon: ReactNode }) => void;
  setMoveDialog: (value: { ids: string[]; currentMailbox?: string } | null) => void;
  markRead: (ids: string[]) => void;
  markUnread: (ids: string[]) => void;
  toggleStar: (id: string) => void;
  starred: Record<string, boolean>;
  toggleArchiveForMessage: (id: string) => void;
  toggleTrashForMessage: (id: string) => void;
};

export function MailDetailActionBar({
  active,
  closeMobileDetail,
  show,
  setMoveDialog,
  markRead,
  markUnread,
  toggleStar,
  starred,
  toggleArchiveForMessage,
  toggleTrashForMessage,
}: MailDetailActionBarProps) {
  if (!active) return <ActionBar onBack={closeMobileDetail} />;
  const moveToMailbox = () => setMoveDialog({ ids: [active.id], currentMailbox: active.mailbox });
  const reply = () => show("Reply", { icon: <Reply className="size-4" /> });
  const replyAll = () => show("Reply all", { icon: <ReplyAll className="size-4" /> });
  const forward = () => show("Forward", { icon: <Forward className="size-4" /> });
  const toggleUnreadForActive = () =>
    active.unread ? markRead([active.id]) : markUnread([active.id]);
  const toggleStarForActive = () => toggleStar(active.id);
  const toggleArchiveForActive = () => toggleArchiveForMessage(active.id);
  const toggleTrashForActive = () => toggleTrashForMessage(active.id);
  const mobileReplyItems: MenuDropdownItemProps[] = [
    { id: "reply", label: "Reply", icon: <Reply className="size-4" />, onClick: reply },
    {
      id: "reply-all",
      label: "Reply all",
      icon: <ReplyAll className="size-4" />,
      onClick: replyAll,
    },
  ];
  const detailActionButtons = buildMailActionButtons({
    moveToMailbox,
    toggleUnread: toggleUnreadForActive,
    toggleStar: toggleStarForActive,
    toggleArchive: toggleArchiveForActive,
    toggleTrash: toggleTrashForActive,
    isUnread: active.unread,
    isStarred: !!starred[active.id],
    isArchived: active.mailbox === "Archive",
    isTrashed: active.mailbox === "Trash",
  });
  const overflowItems: MenuDropdownItemProps[] = detailActionButtons.map((button) => ({
    id: button.id,
    label: button.label,
    icon: button.icon,
    onClick: button.onClick,
    checked: button.active,
  }));

  return (
    <ActionBar
      onBack={closeMobileDetail}
      left={
        <>
          <div className="mail-detail-actions-desktop flex items-center gap-2">
            <ToolbarButton label="Reply" onClick={reply}>
              <Reply className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Reply all" onClick={replyAll}>
              <ReplyAll className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Forward" onClick={forward}>
              <Forward className="size-4" />
            </ToolbarButton>
          </div>
          <div className="mail-detail-actions-compact items-center gap-2">
            <MenuDropdown
              align="start"
              sideOffset={10}
              items={mobileReplyItems}
              contentClassName="min-w-[11rem] p-1.5"
              trigger={
                <button
                  type="button"
                  aria-label="Reply options"
                  className="size-9 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    color: "color-mix(in oklab, var(--color-ink) 70%, transparent)",
                    backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                  }}
                >
                  <Reply className="size-4" />
                </button>
              }
            />
            <ToolbarButton label="Forward" onClick={forward}>
              <Forward className="size-4" />
            </ToolbarButton>
          </div>
        </>
      }
      right={
        <>
          <div className="mail-detail-actions-desktop flex items-center gap-2">
            {detailActionButtons.map((button) => (
              <ToolbarButton
                key={button.id}
                label={button.label}
                onClick={button.onClick}
                active={button.active}
              >
                {button.icon}
              </ToolbarButton>
            ))}
          </div>
          <div className="mail-detail-actions-compact">
            <MenuDropdown
              align="end"
              sideOffset={10}
              items={overflowItems}
              contentClassName="min-w-[12.5rem] p-1.5"
              trigger={
                <button
                  type="button"
                  aria-label="More actions"
                  className="size-9 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    color: "color-mix(in oklab, var(--color-ink) 70%, transparent)",
                    backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                  }}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              }
            />
          </div>
        </>
      }
    />
  );
}

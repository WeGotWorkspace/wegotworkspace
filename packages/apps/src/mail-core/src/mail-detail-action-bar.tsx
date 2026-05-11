import { FileEdit, Forward, MoreHorizontal, Reply, ReplyAll } from "lucide-react";
import { ToolbarButton } from "@/action-buttons/src/action-buttons";
import { ActionBar } from "@/action-bar/src/action-bar";
import { MenuDropdown } from "@/menu-dropdown/src/menu-dropdown";
import type { MenuDropdownItemProps } from "@/menu-dropdown/src/menu-dropdown";
import type { Mail } from "@/types/mail";
import { buildMailActionButtons } from "@/mail-core/src/mail-action-buttons";

type MailDetailActionBarProps = {
  active: Mail | undefined;
  closeMobileDetail: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onEditDraft: () => void;
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
  onReply,
  onReplyAll,
  onForward,
  onEditDraft,
  setMoveDialog,
  markRead,
  markUnread,
  toggleStar,
  starred,
  toggleArchiveForMessage,
  toggleTrashForMessage,
}: MailDetailActionBarProps) {
  if (!active) return <ActionBar onBack={closeMobileDetail} />;
  const isDraft = active.mailbox === "Drafts";
  const moveToMailbox = () => setMoveDialog({ ids: [active.id], currentMailbox: active.mailbox });
  const toggleUnreadForActive = () =>
    active.unread ? markRead([active.id]) : markUnread([active.id]);
  const toggleStarForActive = () => toggleStar(active.id);
  const toggleArchiveForActive = () => toggleArchiveForMessage(active.id);
  const toggleTrashForActive = () => toggleTrashForMessage(active.id);
  const mobileReplyItems: MenuDropdownItemProps[] = [
    ...(isDraft
      ? [
          {
            id: "edit-draft",
            label: "Edit draft",
            icon: <FileEdit className="size-4" />,
            onClick: onEditDraft,
          },
        ]
      : [
          { id: "reply", label: "Reply", icon: <Reply className="size-4" />, onClick: onReply },
          {
            id: "reply-all",
            label: "Reply all",
            icon: <ReplyAll className="size-4" />,
            onClick: onReplyAll,
          },
        ]),
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
            {isDraft ? (
              <ToolbarButton label="Edit draft" onClick={onEditDraft}>
                <FileEdit className="size-4" />
              </ToolbarButton>
            ) : (
              <>
                <ToolbarButton label="Reply" onClick={onReply}>
                  <Reply className="size-4" />
                </ToolbarButton>
                <ToolbarButton label="Reply all" onClick={onReplyAll}>
                  <ReplyAll className="size-4" />
                </ToolbarButton>
                <ToolbarButton label="Forward" onClick={onForward}>
                  <Forward className="size-4" />
                </ToolbarButton>
              </>
            )}
          </div>
          <div className="mail-detail-actions-compact items-center gap-2">
            {isDraft ? (
              <ToolbarButton label="Edit draft" onClick={onEditDraft}>
                <FileEdit className="size-4" />
              </ToolbarButton>
            ) : (
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
            )}
            {!isDraft ? (
              <ToolbarButton label="Forward" onClick={onForward}>
                <Forward className="size-4" />
              </ToolbarButton>
            ) : null}
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

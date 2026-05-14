import { FileEdit, Forward, MoreHorizontal, Reply, ReplyAll } from "lucide-react";
import { IconButton } from "@/app-button/src/button";
import { TOOLBAR_ICON_BUTTON_STYLE } from "@/app-button/src/icon-button-presets";
import { ActionBar } from "@/action-bar/src/action-bar";
import { MenuDropdown } from "@/menu-dropdown/src/menu-dropdown";
import type { MenuDropdownItemProps } from "@/menu-dropdown/src/menu-dropdown";
import type { Mail } from "@/types/mail";
import { buildMailActionButtons } from "@/mail-core/src/mail-action-buttons";
import { MAIL_DETAIL_ICON_TRIGGER_STYLE } from "@/mail-core/src/mail-detail-action-bar.styles";

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
              <IconButton
                label="Edit draft"
                onClick={onEditDraft}
                icon={<FileEdit className="size-4" />}
                variant="subtle"
                style={TOOLBAR_ICON_BUTTON_STYLE}
              />
            ) : (
              <>
                <IconButton
                  label="Reply"
                  onClick={onReply}
                  icon={<Reply className="size-4" />}
                  variant="subtle"
                  style={TOOLBAR_ICON_BUTTON_STYLE}
                />
                <IconButton
                  label="Reply all"
                  onClick={onReplyAll}
                  icon={<ReplyAll className="size-4" />}
                  variant="subtle"
                  style={TOOLBAR_ICON_BUTTON_STYLE}
                />
                <IconButton
                  label="Forward"
                  onClick={onForward}
                  icon={<Forward className="size-4" />}
                  variant="subtle"
                  style={TOOLBAR_ICON_BUTTON_STYLE}
                />
              </>
            )}
          </div>
          <div className="mail-detail-actions-compact items-center gap-2">
            {isDraft ? (
              <IconButton
                label="Edit draft"
                onClick={onEditDraft}
                icon={<FileEdit className="size-4" />}
                variant="subtle"
                style={TOOLBAR_ICON_BUTTON_STYLE}
              />
            ) : (
              <MenuDropdown
                align="start"
                sideOffset={10}
                items={mobileReplyItems}
                contentClassName="min-w-[11rem] p-1.5"
                trigger={
                  <IconButton
                    label="Reply options"
                    icon={<Reply className="size-4" />}
                    showTooltip={false}
                    variant="subtle"
                    style={MAIL_DETAIL_ICON_TRIGGER_STYLE}
                  />
                }
              />
            )}
            {!isDraft ? (
              <IconButton
                label="Forward"
                onClick={onForward}
                icon={<Forward className="size-4" />}
                variant="subtle"
                style={TOOLBAR_ICON_BUTTON_STYLE}
              />
            ) : null}
          </div>
        </>
      }
      right={
        <>
          <div className="mail-detail-actions-desktop flex items-center gap-2">
            {detailActionButtons.map((button) => (
              <IconButton
                key={button.id}
                label={button.label}
                onClick={button.onClick}
                active={button.active}
                icon={button.icon}
                variant="subtle"
                style={TOOLBAR_ICON_BUTTON_STYLE}
              />
            ))}
          </div>
          <div className="mail-detail-actions-compact">
            <MenuDropdown
              align="end"
              sideOffset={10}
              items={overflowItems}
              contentClassName="min-w-[12.5rem] p-1.5"
              trigger={
                <IconButton
                  label="More actions"
                  icon={<MoreHorizontal className="size-4" />}
                  showTooltip={false}
                  variant="subtle"
                  style={MAIL_DETAIL_ICON_TRIGGER_STYLE}
                />
              }
            />
          </div>
        </>
      }
    />
  );
}

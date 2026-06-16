import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { Pencil, RefreshCw, Trash2, UserMinus } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { ListItem } from "@/list-item/src/list-item";
import { ViewHeader } from "@/view-header/src/view-header";
import { ContactUserAvatar } from "./contact-user-avatar";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { WorkspaceSwipeList } from "@/workspace-swipe-list/src/workspace-swipe-list";
import { cn } from "@/lib/utils";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  contactDisplayName,
  contactListDetail,
  contactListSubtitle,
} from "@/contacts-core/src/contacts-display-utils";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

type ContactsListPanelProps = {
  L: ContactsUILabels;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  viewLabel: string;
  view: string;
  selectedGroupId: string | null;
  canRenameGroup: boolean;
  openGroupRenameDialog: (groupId: string, name: string) => void;
  canDeleteGroup: boolean;
  onDeleteGroup: (groupId: string) => void;
  selectedIds: string[];
  selectionMode: boolean;
  listLoading: boolean;
  visibleCards: ContactCard[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  isTouch: boolean;
  activeId: string;
  isItemDragging: (id: string) => boolean;
  handleSelect: (id: string, e: ReactMouseEvent) => void;
  enterSelectionFor: (id: string) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  onSwipeDelete: (id: string) => void;
  onSwipeRemoveFromGroup: (id: string) => void;
  selectionBar: ReactNode;
  onRefreshList?: () => void;
};

export function ContactsListPanel({
  L,
  sidebarOpen,
  onToggleSidebar,
  viewLabel,
  view,
  selectedGroupId,
  canRenameGroup,
  openGroupRenameDialog,
  canDeleteGroup,
  onDeleteGroup,
  selectedIds,
  selectionMode,
  listLoading,
  visibleCards,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  isTouch,
  activeId,
  isItemDragging,
  handleSelect,
  enterSelectionFor,
  itemDragHandlers,
  onSwipeDelete,
  onSwipeRemoveFromGroup,
  selectionBar,
  onRefreshList,
}: ContactsListPanelProps) {
  return {
    header: (
      <ViewHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        title={viewLabel}
        subtitle={
          selectionMode || selectedIds.length > 1
            ? L.listSelected(selectedIds.length)
            : L.listContacts(visibleCards.length)
        }
        actions={
          <>
            {onRefreshList ? (
              <IconButton
                label={L.refreshList}
                onClick={onRefreshList}
                disabled={listLoading}
                icon={
                  <RefreshCw className={cn("size-4", listLoading && "animate-spin")} aria-hidden />
                }
                size="sm"
                variant="subtle"
              />
            ) : null}
            {selectedGroupId ? (
              <>
                {canRenameGroup ? (
                  <IconButton
                    label={L.renameGroup}
                    onClick={() => openGroupRenameDialog(selectedGroupId, viewLabel)}
                    icon={<Pencil />}
                    size="sm"
                    variant="subtle"
                  />
                ) : null}
                {canDeleteGroup ? (
                  <IconButton
                    label={L.deleteGroup}
                    onClick={() => onDeleteGroup(selectedGroupId)}
                    icon={<Trash2 />}
                    size="sm"
                    variant="subtle"
                  />
                ) : null}
              </>
            ) : null}
          </>
        }
        searchPlaceholder={L.searchPlaceholder}
        searchValue={searchQuery}
        onSearchInput={setSearchQuery}
        searchInputRef={searchInputRef}
      />
    ),
    listContent: listLoading ? (
      <div className="contacts-list-panel__loading" aria-busy>
        <LoadingSpinner size="lg" label={L.listLoading} />
      </div>
    ) : (
      <WorkspaceSwipeList isTouch={isTouch}>
        {visibleCards.map((card) => {
          const dragHandlers = itemDragHandlers(card.id) as {
            onDragStart?: () => void;
            onDragEnd?: () => void;
          };
          const name = contactDisplayName(card);
          return (
            <ListItem
              key={card.id}
              id={card.id}
              title={name}
              subtitle={contactListSubtitle(card)}
              metaPosition="below"
              date=""
              text={contactListDetail(card)}
              icons={[]}
              leading={
                <ContactUserAvatar
                  card={card}
                  compact
                  size="sm"
                  className="contacts-list-panel__avatar"
                />
              }
              isActive={card.id === activeId}
              isSelected={selectedIds.includes(card.id)}
              selectionMode={selectionMode}
              isTouch={isTouch}
              isDragging={isItemDragging(card.id)}
              onClick={(e: ReactMouseEvent) => handleSelect(card.id, e)}
              onLongPress={() => enterSelectionFor(card.id)}
              {...dragHandlers}
              onDragStart={dragHandlers.onDragStart ?? (() => {})}
              onDragEnd={dragHandlers.onDragEnd ?? (() => {})}
              emptyTitle={L.unknownContact}
              {...(isTouch
                ? selectedGroupId
                  ? {
                      swipeRightAction: {
                        icon: <UserMinus className="size-5" />,
                        color: "var(--contacts-swipe-remove-color)",
                        label: L.swipeRemoveFromGroup,
                        onActivate: () => onSwipeRemoveFromGroup(card.id),
                      },
                    }
                  : {
                      swipeRightAction: {
                        icon: <Trash2 className="size-5" />,
                        color: "var(--contacts-swipe-delete-color)",
                        label: L.swipeDelete,
                        destructive: true,
                        onActivate: () => onSwipeDelete(card.id),
                      },
                    }
                : {})}
            />
          );
        })}
      </WorkspaceSwipeList>
    ),
    hasItems: listLoading || visibleCards.length > 0,
    emptyLabel: view.startsWith("group:") ? L.emptyGroupMembers : L.emptyList,
    floatingActionBar: selectionBar,
  };
}

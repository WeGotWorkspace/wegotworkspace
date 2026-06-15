import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { UserPlus } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { ListItem } from "@/list-item/src/list-item";
import { ViewHeader } from "@/view-header/src/view-header";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { WorkspaceSwipeList } from "@/workspace-swipe-list/src/workspace-swipe-list";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  contactDisplayName,
  contactListDetail,
  contactListSubtitle,
  contactPhotoUrl,
} from "@/contacts-core/src/contacts-display-utils";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

type ContactsListPanelProps = {
  L: ContactsUILabels;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  viewLabel: string;
  selectedIds: string[];
  selectionMode: boolean;
  listLoading: boolean;
  visibleCards: ContactCard[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  canCreateContact: boolean;
  isTouch: boolean;
  activeId: string;
  isItemDragging: (id: string) => boolean;
  handleSelect: (id: string, e: ReactMouseEvent) => void;
  enterSelectionFor: (id: string) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  createContact: () => void;
  selectionBar: ReactNode;
};

export function ContactsListPanel({
  L,
  sidebarOpen,
  onToggleSidebar,
  viewLabel,
  selectedIds,
  selectionMode,
  listLoading,
  visibleCards,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  canCreateContact,
  isTouch,
  activeId,
  isItemDragging,
  handleSelect,
  enterSelectionFor,
  itemDragHandlers,
  createContact,
  selectionBar,
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
          <div className="contacts-list-panel__header-actions flex items-center gap-2">
            <IconButton
              label={L.newContact}
              onClick={createContact}
              icon={<UserPlus />}
              size="sm"
              variant="subtle"
              disabled={!canCreateContact}
            />
          </div>
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
              date=""
              text={contactListDetail(card)}
              icons={[]}
              leading={
                <UserAvatar
                  displayName={name}
                  imageSrc={contactPhotoUrl(card)}
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
            />
          );
        })}
      </WorkspaceSwipeList>
    ),
    hasItems: listLoading || visibleCards.length > 0,
    emptyLabel: L.emptyList,
    floatingActionBar: selectionBar,
  };
}

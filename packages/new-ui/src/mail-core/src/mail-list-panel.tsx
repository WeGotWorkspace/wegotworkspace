import type { ReactNode, RefObject } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Archive, Circle, Loader2, Star } from "lucide-react";
import { ListHeader } from "@/list-header/src/list-header";
import { ListItem } from "@/list-item/src/list-item";
import { WorkspaceSwipeList } from "@/workspace-swipe-list/src/workspace-swipe-list";
import { WorkspaceListLoadingState } from "@/workspace-list-state/src/workspace-list-loading-state";
import type { Mail } from "@/types/mail";
import type { MailUILabels } from "@/mail-core/src/mail-app.stories.fixtures";
import { formatMailDateForList } from "@/mail-core/src/mail-date-utils";

type MailListPanelProps = {
  L: MailUILabels;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  viewLabel: string;
  selectedIds: string[];
  selectionMode: boolean;
  effectiveListLoading: boolean;
  visibleMail: Mail[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  inTrash: boolean;
  isTouch: boolean;
  starred: Record<string, boolean>;
  activeId: string;
  isItemDragging: (id: string) => boolean;
  handleSelect: (id: string, e: ReactMouseEvent) => void;
  enterSelectionFor: (id: string) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  toggleStar: (id: string) => void;
  moveOne: (id: string, mb: string) => void;
  listEndRef: RefObject<HTMLDivElement | null>;
  isLoadingMore: boolean;
  selectionBar: ReactNode;
};

export function MailListPanel({
  L,
  sidebarOpen,
  onToggleSidebar,
  viewLabel,
  selectedIds,
  selectionMode,
  effectiveListLoading,
  visibleMail,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  inTrash,
  isTouch,
  starred,
  activeId,
  isItemDragging,
  handleSelect,
  enterSelectionFor,
  itemDragHandlers,
  toggleStar,
  moveOne,
  listEndRef,
  isLoadingMore,
  selectionBar,
}: MailListPanelProps) {
  return {
    header: (
      <ListHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        title={viewLabel}
        subtitle={
          selectionMode || selectedIds.length > 1 ? `${selectedIds.length} Selected` : undefined
        }
        actions={<></>}
        searchPlaceholder="Search mail..."
        searchValue={searchQuery}
        onSearchInput={setSearchQuery}
        searchInputRef={searchInputRef}
      />
    ),
    listContent: effectiveListLoading ? (
      <WorkspaceListLoadingState message={L.listLoading} />
    ) : (
      <>
        <WorkspaceSwipeList isTouch={isTouch}>
          {visibleMail.map((m) => {
            const dragHandlers = itemDragHandlers(m.id) as {
              onDragStart?: () => void;
              onDragEnd?: () => void;
            };
            return (
              <ListItem
                key={m.id}
                id={m.id}
                title={m.title}
                subtitle={m.from}
                date={formatMailDateForList(m.date)}
                text={m.excerpt}
                icons={[
                  m.unread ? (
                    <Circle
                      className="size-2.5 mail-state-accent"
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  ) : null,
                  starred[m.id] ? (
                    <Star className="size-3 mail-state-accent" fill="currentColor" />
                  ) : null,
                ].filter(Boolean)}
                isActive={m.id === activeId}
                isSelected={selectedIds.includes(m.id)}
                selectionMode={selectionMode}
                isTouch={isTouch}
                isDragging={isItemDragging(m.id)}
                onClick={(e: ReactMouseEvent) => handleSelect(m.id, e)}
                onLongPress={() => enterSelectionFor(m.id)}
                {...dragHandlers}
                onDragStart={dragHandlers.onDragStart ?? (() => {})}
                onDragEnd={dragHandlers.onDragEnd ?? (() => {})}
                {...(isTouch
                  ? {
                      swipeLeftAction: {
                        icon: (
                          <Star className="size-5" fill={starred[m.id] ? "currentColor" : "none"} />
                        ),
                        color: "var(--color-emerald)",
                        label: starred[m.id] ? "Unstar" : "Star",
                        onActivate: () => toggleStar(m.id),
                      },
                      swipeRightAction: {
                        icon: <Archive className="size-5" />,
                        color: "var(--color-ink)",
                        label: "Archive",
                        destructive: true,
                        onActivate: () => moveOne(m.id, "Archive"),
                      },
                    }
                  : {})}
              />
            );
          })}
        </WorkspaceSwipeList>
        <div ref={listEndRef} className="h-6" aria-hidden />
        {isLoadingMore ? (
          <div className="flex items-center justify-center py-3">
            <Loader2
              className="size-5 animate-spin text-[color-mix(in_oklab,var(--color-ink)_45%,transparent)]"
              aria-label={L.listLoading}
            />
          </div>
        ) : null}
      </>
    ),
    hasItems: effectiveListLoading || visibleMail.length > 0,
    emptyLabel: "No messages",
    floatingActionBar: selectionBar,
  };
}

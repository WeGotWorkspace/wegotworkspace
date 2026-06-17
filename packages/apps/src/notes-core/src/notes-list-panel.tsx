import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { Archive, Circle, Pencil, Star, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { Callout } from "@/callout/src/callout";
import { ListItem } from "@/list-item/src/list-item";
import { ViewHeader } from "@/view-header/src/view-header";
import type { Note } from "@/lib/models/note";
import { formatNoteDateForList } from "@/notes-core/src/notes-date-utils";
import type { NotesUILabels } from "@/notes-core/src/notes-labels";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { WorkspaceSwipeList } from "@/workspace-swipe-list/src/workspace-swipe-list";
import "@/notes-core/src/notes-list-panel.css";

type NotesListPanelProps = {
  L: NotesUILabels;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  viewLabel: string;
  selectedIds: string[];
  selectionMode: boolean;
  listLoading: boolean;
  visibleNotes: Note[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  canEditDelete: boolean;
  selectedNotebook: string | null;
  selectedTag: string | null;
  view: string;
  isTouch: boolean;
  starred: Record<string, boolean>;
  archived: Record<string, boolean>;
  activeId: string;
  isItemDragging: (id: string) => boolean;
  handleSelect: (id: string, e: ReactMouseEvent) => void;
  enterSelectionFor: (id: string) => void;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  openEditDialog: (item: { kind: "notebook" | "tag"; name: string }) => void;
  openDeleteDialog: (item: { kind: "notebook" | "tag"; name: string }) => void;
  openDeleteConfirmForArchive: (ids: string[], mode: "selected" | "all") => void;
  toggleStar: (id: string) => void;
  toggleArchive: (id: string) => void;
  selectionBar: ReactNode;
  pendingNoteIds?: ReadonlySet<string>;
  failedSyncCount?: number;
  onRetrySync?: () => void;
};

export function NotesListPanel({
  L,
  sidebarOpen,
  onToggleSidebar,
  viewLabel,
  selectedIds,
  selectionMode,
  listLoading,
  visibleNotes,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  canEditDelete,
  selectedNotebook,
  selectedTag,
  view,
  isTouch,
  starred,
  archived,
  activeId,
  isItemDragging,
  handleSelect,
  enterSelectionFor,
  itemDragHandlers,
  openEditDialog,
  openDeleteDialog,
  openDeleteConfirmForArchive,
  toggleStar,
  toggleArchive,
  selectionBar,
  pendingNoteIds,
  failedSyncCount = 0,
  onRetrySync,
}: NotesListPanelProps) {
  const retryCallout =
    failedSyncCount > 0 && onRetrySync ? (
      <Callout
        className="notes-list-panel__retry-callout"
        severity="error"
        title={L.syncFailedTitle}
        message={L.syncFailedMessage}
        action={<Button variant="subtle" size="sm" label={L.retrySync} onClick={onRetrySync} />}
      />
    ) : null;

  return {
    header: (
      <ViewHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        title={viewLabel}
        subtitle={
          selectionMode || selectedIds.length > 1
            ? L.listSelected(selectedIds.length)
            : L.listFiles(visibleNotes.length)
        }
        actions={
          <div className="notes-list-panel__header-actions flex items-center gap-2">
            {canEditDelete ? (
              <>
                <IconButton
                  label={L.edit}
                  onClick={() =>
                    openEditDialog(
                      selectedNotebook
                        ? { kind: "notebook", name: selectedNotebook }
                        : { kind: "tag", name: selectedTag! },
                    )
                  }
                  icon={<Pencil />}
                  size="sm"
                  variant="subtle"
                />
                <IconButton
                  label={L.remove}
                  onClick={() =>
                    openDeleteDialog(
                      selectedNotebook
                        ? { kind: "notebook", name: selectedNotebook }
                        : { kind: "tag", name: selectedTag! },
                    )
                  }
                  icon={<Trash2 />}
                  size="sm"
                  variant="subtle"
                />
              </>
            ) : null}
            {view === "archive" && visibleNotes.length > 0 ? (
              <IconButton
                label={L.emptyArchive}
                onClick={() =>
                  openDeleteConfirmForArchive(
                    visibleNotes.map((n) => n.id),
                    "all",
                  )
                }
                icon={<Trash2 />}
                size="sm"
                variant="subtle"
              />
            ) : null}
          </div>
        }
        searchPlaceholder={L.searchPlaceholder}
        searchValue={searchQuery}
        onSearchInput={setSearchQuery}
        searchInputRef={searchInputRef}
      />
    ),
    listContent: listLoading ? (
      <div className="notes-list-panel__loading" aria-busy>
        <LoadingSpinner size="lg" label={L.listLoading} />
      </div>
    ) : (
      <>
        {retryCallout}
        <WorkspaceSwipeList isTouch={isTouch}>
          {visibleNotes.map((note) => {
            const dragHandlers = itemDragHandlers(note.id) as {
              onDragStart?: () => void;
              onDragEnd?: () => void;
            };
            const isPendingSync = pendingNoteIds?.has(note.id) ?? false;
            return (
              <ListItem
                key={note.id}
                id={note.id}
                title={note.title}
                subtitle={note.notebook}
                date={formatNoteDateForList(note.date)}
                text={note.excerpt}
                icons={[
                  isPendingSync ? (
                    <span
                      key="pending"
                      className="notes-list-panel__pending-dot"
                      role="img"
                      aria-label={L.pendingSync}
                    >
                      <Circle className="size-2.5" fill="currentColor" strokeWidth={0} />
                    </span>
                  ) : null,
                  <span
                    key="star"
                    className="notes-list-panel__star-pip"
                    data-active={starred[note.id] ? "true" : "false"}
                  >
                    <Star className="notes-list-panel__star-icon" fill="currentColor" />
                  </span>,
                ].filter(Boolean)}
                isActive={note.id === activeId}
                isSelected={selectedIds.includes(note.id)}
                selectionMode={selectionMode}
                isTouch={isTouch}
                isDragging={isItemDragging(note.id)}
                onClick={(e: ReactMouseEvent) => handleSelect(note.id, e)}
                onLongPress={() => enterSelectionFor(note.id)}
                {...dragHandlers}
                onDragStart={dragHandlers.onDragStart ?? (() => {})}
                onDragEnd={dragHandlers.onDragEnd ?? (() => {})}
                {...(isTouch
                  ? {
                      swipeLeftAction: {
                        icon: (
                          <Star
                            className="size-5"
                            fill={starred[note.id] ? "currentColor" : "none"}
                          />
                        ),
                        color: "var(--color-emerald)",
                        label: starred[note.id] ? L.swipeUnstar : L.swipeStar,
                        onActivate: () => toggleStar(note.id),
                      },
                      swipeRightAction: {
                        icon: <Archive className="size-5" />,
                        color: "var(--color-ink)",
                        label: archived[note.id] ? L.swipeUnarchive : L.swipeArchive,
                        destructive: true,
                        onActivate: () => toggleArchive(note.id),
                      },
                    }
                  : {})}
              />
            );
          })}
        </WorkspaceSwipeList>
      </>
    ),
    hasItems: listLoading || visibleNotes.length > 0,
    emptyLabel: L.emptyList,
    floatingActionBar: selectionBar,
  };
}

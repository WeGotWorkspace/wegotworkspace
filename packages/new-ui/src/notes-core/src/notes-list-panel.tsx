import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { Archive, Pencil, Star, Trash2 } from "lucide-react";
import { ListAction } from "@/action-buttons/src/action-buttons";
import { ListHeader } from "@/list-header/src/list-header";
import { ListItem } from "@/list-item/src/list-item";
import type { Note } from "@/lib/models/note";
import type { NotesUILabels } from "@/notes-core/src/notes-app.stories.fixtures";
import { WorkspaceListLoadingState } from "@/workspace-list-state/src/workspace-list-loading-state";
import { WorkspaceSwipeList } from "@/workspace-swipe-list/src/workspace-swipe-list";

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
}: NotesListPanelProps) {
  return {
    header: (
      <ListHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        title={viewLabel}
        subtitle={
          selectionMode || selectedIds.length > 1
            ? L.listSelected(selectedIds.length)
            : L.listFiles(visibleNotes.length)
        }
        actions={
          <>
            {canEditDelete ? (
              <>
                <ListAction
                  label={L.edit}
                  onClick={() =>
                    openEditDialog(
                      selectedNotebook
                        ? { kind: "notebook", name: selectedNotebook }
                        : { kind: "tag", name: selectedTag! },
                    )
                  }
                >
                  <Pencil className="size-4" />
                </ListAction>
                <ListAction
                  label={L.remove}
                  onClick={() =>
                    openDeleteDialog(
                      selectedNotebook
                        ? { kind: "notebook", name: selectedNotebook }
                        : { kind: "tag", name: selectedTag! },
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </ListAction>
              </>
            ) : null}
            {view === "archive" && visibleNotes.length > 0 ? (
              <ListAction
                label={L.emptyArchive}
                onClick={() =>
                  openDeleteConfirmForArchive(
                    visibleNotes.map((n) => n.id),
                    "all",
                  )
                }
              >
                <Trash2 className="size-4" />
              </ListAction>
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
      <WorkspaceListLoadingState message={L.listLoading} />
    ) : (
      <WorkspaceSwipeList isTouch={isTouch}>
        {visibleNotes.map((note) => {
          const dragHandlers = itemDragHandlers(note.id) as {
            onDragStart?: () => void;
            onDragEnd?: () => void;
          };
          return (
            <ListItem
              key={note.id}
              id={note.id}
              title={note.title}
              subtitle={note.notebook}
              date={note.date}
              text={note.excerpt}
              icons={[
                <Star
                  key="star"
                  className="size-3 transition-opacity"
                  fill="currentColor"
                  style={{
                    color: "var(--color-emerald)",
                    opacity: starred[note.id] ? 1 : 0,
                  }}
                />,
              ]}
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
    ),
    hasItems: listLoading || visibleNotes.length > 0,
    emptyLabel: L.emptyList,
    floatingActionBar: selectionBar,
  };
}

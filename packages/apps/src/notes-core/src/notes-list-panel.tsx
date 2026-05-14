import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { Archive, Pencil, Star, Trash2 } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { ListHeader } from "@/list-header/src/list-header";
import { ListItem } from "@/list-item/src/list-item";
import type { Note } from "@/lib/models/note";
import { formatNoteDateForList } from "@/notes-core/src/notes-date-utils";
import type { NotesUILabels } from "@/notes-core/src/notes-app.stories.fixtures";
import { WorkspaceListLoadingState } from "@/workspace-list-state/src/workspace-list-loading-state";
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
              date={formatNoteDateForList(note.date)}
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

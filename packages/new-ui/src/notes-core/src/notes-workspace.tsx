import { Pencil } from "lucide-react";
import type { NotesWorkspaceProps } from "@/notes-core/src/notes-workspace-props";
import "react-swipeable-list/dist/styles.css";
import { AppButton } from "@/app-button/src/app-button";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { MoveToDialog, EditDialog, DeleteDialog, TagPickerDialog } from "@/dialogs/src/dialogs";
import { NoteDetailView } from "@/note-detail-view/src/note-detail-view";
import { MultiSelectionView } from "@/multi-selection-view/src/multi-selection-view";
import { WorkspaceApp } from "@/workspace-app/src/workspace-app";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { NotesDetailActionBar } from "@/notes-core/src/notes-detail-action-bar";
import { formatNoteDateForDetail } from "@/notes-core/src/notes-date-utils";
import { NotesListPanel } from "@/notes-core/src/notes-list-panel";
import { useNotesController } from "@/notes-core/src/use-notes-controller";
import { useNotesSidebarModel } from "@/notes-core/src/use-notes-sidebar-model";

export function NotesWorkspace({
  data,
  session,
  labels,
  operations,
  listLoading = false,
  logoutTo = "/",
}: NotesWorkspaceProps) {
  const closeSidebarOnMobile = (closeSidebar: () => void) => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    closeSidebar();
  };

  const {
    L,
    notes,
    notebooks,
    tags,
    active,
    activeId,
    view,
    viewLabel,
    starred,
    archived,
    selectedIds,
    selectionMode,
    canCreateNote,
    selectedNotebook,
    selectedTag,
    canEditDelete,
    searchQuery,
    searchInputRef,
    moveDialog,
    editDialog,
    deleteDialog,
    tagDialog,
    visibleNotes,
    workspaceLayoutRef,
    isTouch,
    confirmDialog,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    selectionBarButtons,
    selectionBar,
    handleSelect,
    enterSelectionFor,
    selectView,
    setSearchQuery,
    setMoveDialog,
    setEditDialog,
    setDeleteDialog,
    setTagDialog,
    moveToNotebook,
    assignTagToNotes,
    createNote,
    toggleStar,
    toggleArchive,
    openDeleteConfirm,
    renameNotebook,
    renameTag,
    deleteNotebook,
    deleteTag,
    toggleNoteTag,
    updateNote,
  } = useNotesController({
    data,
    labels,
    listLoading,
    operations,
  });

  const { primarySidebarItems, notebookSidebarItems, tagSidebarItems } = useNotesSidebarModel({
    labels: L,
    view,
    notebooks,
    tags,
    selectView,
    sidebarDropZoneProps,
    moveToNotebook,
    assignTagToNotes,
  });

  return (
    <>
      <WorkspaceApp
        ref={workspaceLayoutRef}
        workspaceRoot={{
          style: {
            ["--workspace-root-bg" as string]: "var(--color-paper)",
            ["--app-sidebar-bg" as string]: "var(--color-paper)",
            ["--app-sidebar-border-color" as string]:
              "color-mix(in oklab, var(--color-ink) 15%, transparent)",
            ["--app-sidebar-brand-fill" as string]: "var(--color-ink)",
            ["--app-sidebar-close-button-color" as string]: "var(--color-ink)",
            ["--workspace-user-footer-text-color" as string]:
              "color-mix(in oklab, var(--color-ink) 70%, transparent)",
            ["--workspace-user-footer-border-color" as string]:
              "color-mix(in oklab, var(--color-ink) 10%, transparent)",
            ["--workspace-user-footer-avatar-bg" as string]:
              "color-mix(in oklab, var(--color-ink) 12%, transparent)",
            ["--workspace-user-footer-avatar-color" as string]: "var(--color-ink)",
            ["--workspace-user-footer-link-color" as string]:
              "color-mix(in oklab, var(--color-ink) 65%, transparent)",
            ["--workspace-user-footer-link-bg" as string]:
              "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          },
        }}
        sidebar={(c) => (
          <AppSidebar
            open={c.sidebarOpen}
            onCloseMobile={c.closeSidebar}
            appSwitcher={<WorkspaceAppSwitcher />}
          >
            <div className="px-4 mb-4">
              <AppButton
                label={L.newNote}
                icon={<Pencil className="size-4" />}
                onClick={() => {
                  createNote();
                  closeSidebarOnMobile(c.closeSidebar);
                }}
                size="pill"
                variant="primary"
                disabled={!canCreateNote}
              />
            </div>
            <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
              <SidebarSection items={primarySidebarItems} />
              <SidebarSection title={L.sectionNotebooks} items={notebookSidebarItems} />
              <SidebarSection title={L.sectionTags} items={tagSidebarItems} />
            </nav>

            <WorkspaceUserFooter
              name={session.user.displayName}
              initials={workspaceUserInitials(session.user)}
              logoutTo={logoutTo}
              linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)] hover:text-[var(--color-ink)]"
            />
          </AppSidebar>
        )}
        list={(c) =>
          NotesListPanel({
            L,
            sidebarOpen: c.sidebarOpen,
            onToggleSidebar: c.toggleSidebar,
            viewLabel,
            selectedIds,
            selectionMode: selectionMode || selectedIds.length > 1,
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
            openEditDialog: setEditDialog,
            openDeleteDialog: setDeleteDialog,
            openDeleteConfirmForArchive: openDeleteConfirm,
            toggleStar,
            toggleArchive,
            selectionBar,
          })
        }
        actionBar={(c) =>
          selectedIds.length > 1 ? null : (
            <NotesDetailActionBar
              active={active}
              labels={L}
              archived={archived}
              starred={starred}
              closeMobileDetail={c.closeMobileDetail}
              openMoveDialog={(ids) => setMoveDialog({ ids })}
              toggleStar={toggleStar}
              toggleArchive={toggleArchive}
            />
          )
        }
        detail={() => {
          if (selectedIds.length > 1) {
            return (
              <MultiSelectionView
                count={selectedIds.length}
                label="Multiple selection"
                title={(count) => `${count} ${count === 1 ? "note" : "notes"} selected`}
                actions={selectionBarButtons}
              />
            );
          }
          if (!active) return null;
          return (
            <NoteDetailView
              noteId={active.id}
              notebook={active.notebook}
              lastEdited={formatNoteDateForDetail(active.date)}
              editedLabel="Last edited "
              title={active.title}
              onTitleChange={(value) => updateNote(active.id, { title: value })}
              tags={active.tags}
              onTagAdd={() => setTagDialog({ noteId: active.id })}
              onTagRemove={(tag) => toggleNoteTag(active.id, tag)}
              pullQuote={active.pullQuote}
              body={active.body}
              onBodyParagraphChange={(index, value) => {
                const nextBody = [...active.body];
                nextBody[index] = value;
                updateNote(active.id, { body: nextBody });
              }}
            />
          );
        }}
      />

      <MoveToDialog
        open={!!moveDialog}
        notebooks={notebooks}
        title="Change notebook"
        description="Choose or create a notebook for the selected notes."
        confirmLabel="Change"
        allowCreate
        currentNotebook={
          moveDialog?.ids.length === 1
            ? notes.find((note) => note.id === moveDialog.ids[0])?.notebook
            : undefined
        }
        onClose={() => setMoveDialog(null)}
        onConfirm={(notebook) => {
          if (moveDialog) moveToNotebook(moveDialog.ids, notebook);
          setMoveDialog(null);
        }}
      />

      <EditDialog
        item={editDialog}
        onClose={() => setEditDialog(null)}
        onConfirm={(newName) => {
          if (!editDialog) return;
          if (editDialog.kind === "notebook") renameNotebook(editDialog.name, newName);
          else renameTag(editDialog.name, newName);
          setEditDialog(null);
        }}
      />

      <DeleteDialog
        item={deleteDialog}
        notebooks={notebooks}
        affectedCount={
          deleteDialog
            ? deleteDialog.kind === "notebook"
              ? notes.filter((note) => note.notebook === deleteDialog.name).length
              : notes.filter((note) => note.tags.includes(deleteDialog.name)).length
            : 0
        }
        onClose={() => setDeleteDialog(null)}
        onConfirm={(opts) => {
          if (!deleteDialog) return;
          if (deleteDialog.kind === "notebook") deleteNotebook(deleteDialog.name, opts);
          else deleteTag(deleteDialog.name);
          setDeleteDialog(null);
        }}
      />

      <TagPickerDialog
        open={!!tagDialog}
        allTags={tags}
        selected={tagDialog ? (notes.find((note) => note.id === tagDialog.noteId)?.tags ?? []) : []}
        onClose={() => setTagDialog(null)}
        onToggle={(tag) => {
          if (tagDialog) toggleNoteTag(tagDialog.noteId, tag);
        }}
        onCreate={(tag) => {
          if (tagDialog) toggleNoteTag(tagDialog.noteId, tag);
        }}
      />

      {confirmDialog}
    </>
  );
}

import { useEffect, useMemo, useRef } from "react";
import { useWorkspaceListKeyboardShortcuts } from "@/hooks/use-workspace-list-keyboard-shortcuts";
import { isKeyboardFieldTarget } from "@/lib/keyboard/is-keyboard-field-target";
import type { ViewKey } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import { useDriveList } from "@/drive-core/src/use-drive-list";
import { useDriveMutations } from "@/drive-core/src/use-drive-mutations";
import { useDriveShell } from "@/drive-core/src/use-drive-shell";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type UseDriveControllerArgs = {
  data: DriveUIData;
  session: WorkspaceSession;
  operations?: DriveAPIOperations;
  listLoading?: boolean;
  view?: ViewKey;
  onViewChange?: (view: ViewKey) => void;
  onOpenDocsFile?: (apiPath: string) => void;
  onNavigate?: (href: string) => void;
};

/**
 * Drive workspace controller: composes shell navigation, list/selection, and mutation slices.
 * See useDriveShell, useDriveList, and useDriveMutations for domain-specific state.
 */
export function useDriveController({
  data,
  session,
  operations,
  listLoading = false,
  view,
  onViewChange,
  onOpenDocsFile,
  onNavigate,
}: UseDriveControllerArgs) {
  const shell = useDriveShell({
    data,
    session,
    operations,
    listLoading,
    view,
    onViewChange,
    onNavigate,
  });
  const list = useDriveList({ shell, onOpenDocsFile });
  const mutations = useDriveMutations({ shell, list, onOpenDocsFile });
  const resetRenameRef = useRef(mutations.resetRenameDialog);
  resetRenameRef.current = mutations.resetRenameDialog;

  useEffect(() => {
    resetRenameRef.current();
  }, [shell.viewResetKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inField = isKeyboardFieldTarget(e.target);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (!inField && e.key === "/")) {
        e.preventDefault();
        shell.searchInputRef.current?.focus();
        shell.searchInputRef.current?.select();
        return;
      }
      if (inField) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        const opening = !list.detailOpen;
        if (opening && !list.active) {
          const focusId = list.activeId ?? list.selectedIds[0];
          if (focusId) {
            list.setActiveId(focusId);
          }
        }
        list.setDetailOpen(opening);
        return;
      }
      if (e.key === "Escape" && list.lightboxOpen) {
        list.setLightboxOpen(false);
        return;
      }
      if (e.key === "Escape" && list.detailOpen) {
        list.setDetailOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    list.active,
    list.activeId,
    list.detailOpen,
    list.lightboxOpen,
    list.selectedIds,
    list.setActiveId,
    list.setDetailOpen,
    list.setLightboxOpen,
    shell.searchInputRef,
  ]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isKeyboardFieldTarget(e.target)) return;

      if (list.lightboxOpen) {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          list.navigateLightbox(-1);
          return;
        }
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          list.navigateLightbox(1);
          return;
        }
        if (e.key === "Enter" && list.active && list.active.kind !== "folder") {
          e.preventDefault();
          e.stopPropagation();
          list.setLightboxOpen(false);
          list.openDocsEditorFile(list.active);
          return;
        }
        return;
      }

      if (
        e.key === "Enter" &&
        !e.repeat &&
        list.active &&
        list.selectedIds.length <= 1 &&
        !mutations.renameDialog
      ) {
        e.preventDefault();
        e.stopPropagation();
        mutations.requestRenameItem(list.active);
        return;
      }

      if (
        e.code === "Space" &&
        !e.repeat &&
        (list.viewMode === "grid" || list.viewMode === "list") &&
        list.active &&
        list.active.kind !== "folder"
      ) {
        e.preventDefault();
        list.setLightboxOpen(true);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [
    list.active,
    list.lightboxOpen,
    list.navigateLightbox,
    list.openDocsEditorFile,
    list.selectedIds.length,
    list.setLightboxOpen,
    list.viewMode,
    mutations.renameDialog,
    mutations.requestRenameItem,
  ]);

  useWorkspaceListKeyboardShortcuts({
    searchInputRef: shell.searchInputRef,
    selectedCount: list.selectedIds.length,
    onRequestDeleteSelection: mutations.requestDeleteSelected,
    onNavigateList: list.navigateListByKeyboard,
    onUndoQueuedAction: list.undoLatest,
    listNavigationEnabled: !list.lightboxOpen,
  });

  const handleUnifiedSearchSelect = useMemo(
    () =>
      shell.createUnifiedSearchSelectHandler(list.openFile, {
        setActiveId: list.setActiveId,
        setSelectedIds: list.setSelectedIds,
        setDetailOpen: list.setDetailOpen,
      }),
    [
      list.openFile,
      list.setActiveId,
      list.setDetailOpen,
      list.setSelectedIds,
      shell.createUnifiedSearchSelectHandler,
    ],
  );

  return {
    labels: shell.labels,
    launchPluginEditor: shell.launchPluginEditor,
    currentUsername: shell.currentUsername,
    files: shell.files,
    setFiles: shell.setFiles,
    view: shell.view,
    setView: shell.setView,
    activeId: list.activeId,
    setActiveId: list.setActiveId,
    selectedIds: list.selectedIds,
    setSelectedIds: list.setSelectedIds,
    starred: shell.starred,
    setStarred: shell.setStarred,
    sidebarOpen: shell.sidebarOpen,
    setSidebarOpen: shell.setSidebarOpen,
    detailOpen: list.detailOpen,
    setDetailOpen: list.setDetailOpen,
    lightboxOpen: list.lightboxOpen,
    setLightboxOpen: list.setLightboxOpen,
    previewableIds: list.previewableIds,
    navigateLightbox: list.navigateLightbox,
    selectionMode: list.selectionMode,
    setSelectionMode: list.setSelectionMode,
    viewMode: list.viewMode,
    setViewMode: list.setViewMode,
    newFolderDialogOpen: mutations.newFolderDialogOpen,
    setNewFolderDialogOpen: mutations.setNewFolderDialogOpen,
    newFolderName: mutations.newFolderName,
    setNewFolderName: mutations.setNewFolderName,
    renameDialog: mutations.renameDialog,
    setRenameDialog: mutations.setRenameDialog,
    renameName: mutations.renameName,
    setRenameName: mutations.setRenameName,
    confirmDelete: mutations.confirmDelete,
    setConfirmDelete: mutations.setConfirmDelete,
    moveDialog: mutations.moveDialog,
    setMoveDialog: mutations.setMoveDialog,
    markdownDialogOpen: mutations.markdownDialogOpen,
    markdownDialogDefaults: mutations.markdownDialogDefaults,
    markdownDialogSubmitting: mutations.markdownDialogSubmitting,
    markdownDialogError: mutations.markdownDialogError,
    closeMarkdownDialog: mutations.closeMarkdownDialog,
    submitCreateMarkdown: mutations.submitCreateMarkdown,
    searchQuery: shell.searchQuery,
    setSearchQuery: shell.setSearchQuery,
    liveSearchResults: shell.liveSearchResults,
    starredItems: shell.starredItems,
    knownGroupRoots: shell.knownGroupRoots,
    filePreviews: list.filePreviews,
    richPreviews: list.richPreviews,
    dropUploadActive: mutations.dropUploadActive,
    setDropUploadActive: mutations.setDropUploadActive,
    uploadProgress: mutations.uploadProgress,
    fileInputRef: mutations.fileInputRef,
    searchInputRef: shell.searchInputRef,
    isTouch: list.isTouch,
    inTrashView: shell.inTrashView,
    isUnderTrash: shell.isUnderTrash,
    visibleItems: list.visibleItems,
    folderListingPending: shell.folderListingPending,
    breadcrumbs: shell.breadcrumbs,
    viewLabel: shell.viewLabel,
    viewResetKey: shell.viewResetKey,
    active: list.active,
    groupRootNames: shell.groupRootNames,
    sidebarGroupPaths: shell.sidebarGroupPaths,
    openFile: list.openFile,
    openDocsEditorFile: list.openDocsEditorFile,
    handleSelect: list.handleSelect,
    enterSelectionFor: list.enterSelectionFor,
    exitSelection: list.exitSelection,
    fileById: list.fileById,
    toggleStar: mutations.toggleStar,
    batchStar: mutations.batchStar,
    moveToTrash: mutations.moveToTrash,
    moveToFolder: mutations.moveToFolder,
    commitMoveToFolder: mutations.commitMoveToFolder,
    isItemDragging: list.isItemDragging,
    itemDragHandlers: list.itemDragHandlers,
    sidebarDropZoneProps: list.sidebarDropZoneProps,
    folderDropZoneProps: mutations.folderDropZoneProps,
    selectionBar: mutations.selectionBar,
    requestDeleteSelected: mutations.requestDeleteSelected,
    requestDeleteItem: mutations.requestDeleteItem,
    requestMoveSelected: mutations.requestMoveSelected,
    requestMoveItem: mutations.requestMoveItem,
    openMoveDialog: mutations.openMoveDialog,
    requestRenameItem: mutations.requestRenameItem,
    submitRenameItem: mutations.submitRenameItem,
    reallyDelete: mutations.reallyDelete,
    handleUpload: mutations.handleUpload,
    createFolder: mutations.createFolder,
    submitCreateFolder: mutations.submitCreateFolder,
    createMarkdown: mutations.createMarkdown,
    createBlank: mutations.createBlank,
    createFromTemplate: mutations.createFromTemplate,
    newFileTemplates: shell.newFileTemplates,
    selectView: shell.selectView,
    listLoading: shell.listLoading,
    operations: shell.operations,
    handleUnifiedSearchSelect,
  };
}

export type DriveControllerState = ReturnType<typeof useDriveController>;

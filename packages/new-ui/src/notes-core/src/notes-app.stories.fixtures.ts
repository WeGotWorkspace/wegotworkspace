import { workspaceDestructiveDialogLabels } from "@/lib/workspace/destructive-dialog";

/**
 * Mock copy + label bundle for Notes stories and route wiring.
 */
export type NotesUILabels = {
  searchPlaceholder: string;
  sidebarAllItems: string;
  sidebarStarred: string;
  sidebarArchive: string;
  sectionNotebooks: string;
  sectionTags: string;
  addNotebook: string;
  addTag: string;
  listSelected: (count: number) => string;
  listFiles: (count: number) => string;
  emptyList: string;
  newNote: string;
  edit: string;
  remove: string;
  emptyArchive: string;
  fallbackViewTitle: string;
  toastNewNote: string;
  selectionStar: string;
  selectionArchive: string;
  selectionMoveToNotebook: string;
  selectionDeletePermanently: string;
  selectionDone: string;
  swipeStar: string;
  swipeUnstar: string;
  swipeArchive: string;
  swipeUnarchive: string;
  toolbarMoveToNotebook: string;
  toolbarStar: string;
  toolbarArchive: string;
  toolbarUnarchive: string;
  dialogCancel: string;
  dialogDelete: string;
  dialogEmptyArchiveTitle: string;
  dialogDeleteItemsTitle: (count: number) => string;
  dialogEmptyArchiveDescription: (count: number) => string;
  dialogDeleteSelectedDescription: string;
  dialogDeleteConfirmSuffix: string;
  dialogPermanentDeleteLeadIn: string;
  tagViewTitle: (tag: string) => string;
  newNoteCategory: string;
};

export const notesStoryLabels: NotesUILabels = {
  searchPlaceholder: "Search notes...",
  sidebarAllItems: "All Items",
  sidebarStarred: "Starred",
  sidebarArchive: "Archive",
  sectionNotebooks: "Notebooks",
  sectionTags: "Tags",
  addNotebook: "New notebook",
  addTag: "New tag",
  listSelected: (count) => `${count} Selected`,
  listFiles: (count) => `${count} Files`,
  emptyList: "No items",
  newNote: "New note",
  edit: "Edit",
  remove: "Remove",
  emptyArchive: "Empty archive",
  fallbackViewTitle: "Writings",
  toastNewNote: "New note",
  selectionStar: "Star",
  selectionArchive: "Archive",
  selectionMoveToNotebook: "Move to notebook",
  selectionDeletePermanently: "Delete permanently",
  selectionDone: "Done",
  swipeStar: "Star",
  swipeUnstar: "Unstar",
  swipeArchive: "Archive",
  swipeUnarchive: "Unarchive",
  toolbarMoveToNotebook: "Move to notebook",
  toolbarStar: "Star",
  toolbarArchive: "Archive",
  toolbarUnarchive: "Unarchive",
  dialogCancel: workspaceDestructiveDialogLabels.dialogCancel,
  dialogDelete: workspaceDestructiveDialogLabels.dialogDelete,
  dialogEmptyArchiveTitle: "Empty archive?",
  dialogDeleteItemsTitle: (count) => `Delete ${count} item${count === 1 ? "" : "s"}?`,
  dialogEmptyArchiveDescription: (count) => `all ${count} archived item${count === 1 ? "" : "s"}`,
  dialogDeleteSelectedDescription: "the selected items",
  dialogDeleteConfirmSuffix: workspaceDestructiveDialogLabels.dialogDeleteConfirmSuffix,
  dialogPermanentDeleteLeadIn: workspaceDestructiveDialogLabels.dialogPermanentDeleteLeadIn,
  tagViewTitle: (tag) => tag,
  newNoteCategory: "Note",
};

export function mergeNotesLabels(overrides?: Partial<NotesUILabels>): NotesUILabels {
  if (!overrides) return notesStoryLabels;
  return { ...notesStoryLabels, ...overrides };
}

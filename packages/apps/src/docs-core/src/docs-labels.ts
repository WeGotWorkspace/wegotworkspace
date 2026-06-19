export const docsLabels = {
  toastSaved: "Document saved",
  toastSynced: "Changes synced",
  emptyTitle: "No document open",
  emptyDescription: "Open a Markdown file from Drive to start editing.",
  loadError: "Could not load this document.",
  saveError: "Could not save this document.",
  renameError: "Could not rename this document.",
  print: "Print",
  viewSource: "Edit source",
  hideSource: "Hide source",
  rename: "Rename",
  renameDialogTitle: "Rename document",
  renameDialogDescription: "Change the name; the file extension cannot be edited.",
  renameAction: "Rename",
  cancel: "Cancel",
  pendingSync: "Unsaved changes",
  pendingSyncFailed: "Save failed — changes not on server",
  sidebarOutline: "Outline",
  outlineEmpty: "No headings in this document yet.",
  statsWords: (count: number) => `${count.toLocaleString()} words`,
  statsCharacters: (count: number) => `${count.toLocaleString()} characters`,
} as const;

export type DocsUILabels = typeof docsLabels;

export function mergeDocsLabels(overrides?: Partial<DocsUILabels>): DocsUILabels {
  return { ...docsLabels, ...overrides };
}

export const docsLabels = {
  toastSaved: "Document saved",
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
  sidebarOutline: "Outline",
  outlineEmpty: "No headings in this document yet.",
  statsWords: (count: number) => `${count.toLocaleString()} words`,
  statsCharacters: (count: number) => `${count.toLocaleString()} characters`,
  pendingSync: "Pending sync",
  conflictTitle: "Sync conflict",
  conflictDescription: (title: string) =>
    `"${title}" was changed on the server while you were offline. Keep your version or use the server copy?`,
  conflictRemaining: (count: number) =>
    count === 1 ? "1 more conflict waiting" : `${count} more conflicts waiting`,
  conflictKeepMine: "Keep mine",
  conflictUseServer: "Use server",
  syncFailedTitle: "Some changes could not sync",
  syncFailedMessage: "Your edits are saved locally. Retry when you are back online.",
  retrySync: "Retry",
} as const;

export type DocsUILabels = typeof docsLabels;

export function mergeDocsLabels(overrides?: Partial<DocsUILabels>): DocsUILabels {
  return { ...docsLabels, ...overrides };
}

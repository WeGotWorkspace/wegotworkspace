export const docsLabels = {
  toastSaved: "Document saved",
  emptyTitle: "No document open",
  emptyDescription: "Open a Markdown file from Drive to start editing.",
  loadError: "Could not load this document.",
  saveError: "Could not save this document.",
  renameError: "Could not rename this document.",
  print: "Print",
  rename: "Rename",
  renameDialogTitle: "Rename document",
  renameDialogDescription: "Enter a new name for this file.",
  renameAction: "Rename",
  cancel: "Cancel",
  sidebarOutline: "Outline",
  outlineEmpty: "No headings in this document yet.",
  statsWords: (count: number) => `${count.toLocaleString()} words`,
  statsCharacters: (count: number) => `${count.toLocaleString()} characters`,
} as const;

export type DocsUILabels = typeof docsLabels;

export function mergeDocsLabels(overrides?: Partial<DocsUILabels>): DocsUILabels {
  return { ...docsLabels, ...overrides };
}

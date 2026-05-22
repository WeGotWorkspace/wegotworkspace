export const docsLabels = {
  toastSaved: "Document saved",
  emptyTitle: "No document open",
  emptyDescription: "Open a Markdown file from Drive to start editing.",
  loadError: "Could not load this document.",
  saveError: "Could not save this document.",
} as const;

export type DocsUILabels = typeof docsLabels;

export function mergeDocsLabels(overrides?: Partial<DocsUILabels>): DocsUILabels {
  return { ...docsLabels, ...overrides };
}

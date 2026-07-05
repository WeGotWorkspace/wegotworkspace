export { DocsFilePreview } from "@/docs-core/src/docs-file-preview";
export type { DocsFilePreviewProps } from "@/docs-core/src/docs-file-preview";
export { DocsApp } from "@/docs-core/src/docs-app";
export type { DocsAppProps } from "@/docs-core/src/docs-app-props";
export { DocsWorkspace } from "@/docs-core/src/docs-workspace";
export type { DocsWorkspaceProps } from "@/docs-core/src/docs-workspace-props";
export { DocsHomeWorkspace } from "@/docs-core/src/docs-home-workspace";
export type { DocsHomeWorkspaceProps } from "@/docs-core/src/docs-home-workspace";
export {
  useDocsHomeList,
  mapDocsHomeResults,
  sortDocsHomeResults,
  type DocsHomeFetcher,
} from "@/docs-core/src/use-docs-home-list";
export {
  buildDocsHomeDrives,
  collectGroupRoots,
  mergeGroupRoots,
  newDocumentApiPath,
  nextUntitledMarkdownName,
  fallbackUntitledMarkdownName,
  resolveNewDocumentName,
  type DocsHomeDrive,
} from "@/docs-core/src/docs-home-drives";
export { DOCS_EDITOR_EXTENSIONS } from "@/drive-core/src/drive-models";
export {
  docsApiPathFromSearch,
  docsHrefFromApiPath,
  docsSearchFromApiPath,
  openDocsFileInNewWindow,
  parseDocsRouteSearch,
  validateDocsRouteSearch,
  type DocsRouteSearch,
} from "@/docs-core/src/docs-route-search";

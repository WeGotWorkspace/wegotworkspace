/**
 * Browse-mode filters for the Docs home listing. The home view lists drive files
 * Docs can open (Markdown + plain text) across My Drive and group drives, backed by
 * unified search browse mode (no `q` required). See the Docs Home Browse plan.
 */
export const DOCS_HOME_SOURCES = ["file"] as const;

export const DOCS_HOME_EXTENSIONS = ["md", "markdown", "txt"] as const;

export const DOCS_HOME_CATEGORIES = ["document"] as const;

/** Page size for offset/limit pagination (matches the Mail `hasMore` pattern). */
export const DOCS_HOME_PAGE_SIZE = 50;

import {
  DOCS_HOME_CATEGORIES,
  DOCS_HOME_EXTENSIONS,
  DOCS_HOME_SOURCES,
} from "@/docs-core/src/docs-home-constants";

export type DocsListingBrowseFilters = {
  pathPrefix?: string;
  query?: string;
  sources?: readonly string[];
  extensions?: readonly string[];
  categories?: readonly string[];
};

/** Stable cache key for a Docs home browse filter set. */
export function docsListingCacheKey(filters: DocsListingBrowseFilters): string {
  const pathPrefix = filters.pathPrefix?.trim() ?? "";
  const query = filters.query?.trim() ?? "";
  const sources = [...(filters.sources ?? DOCS_HOME_SOURCES)].sort();
  const extensions = [...(filters.extensions ?? DOCS_HOME_EXTENSIONS)].sort();
  const categories = [...(filters.categories ?? DOCS_HOME_CATEGORIES)].sort();
  return JSON.stringify({ pathPrefix, query, sources, extensions, categories });
}

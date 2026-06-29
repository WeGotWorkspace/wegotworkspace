import * as React from "react";

/** Viewports below this width use the review SideDrawer overlay; at/above use a pinned right panel. */
export const DOCS_COMMENTS_COMPACT_MIN = 1160;

export type DocsCommentsLayoutMode = "drawer" | "sidebar";

export function resolveDocsCommentsLayoutMode(width: number): DocsCommentsLayoutMode {
  if (width < DOCS_COMMENTS_COMPACT_MIN) return "drawer";
  return "sidebar";
}

/** Review panel starts closed on all tiers; auto-open when threads/suggestions exist is handled separately. */
export function shouldDefaultCommentsOpen(_layoutMode: DocsCommentsLayoutMode): boolean {
  return false;
}

/** Auto-open when threads appear applies only on the pinned sidebar tier. */
export function shouldAutoOpenCommentsForThreads(layoutMode: DocsCommentsLayoutMode): boolean {
  return layoutMode === "sidebar";
}

/** Draft compose always opens the active comments surface (sidebar or drawer). */
export function shouldAutoOpenCommentsForDraft(
  draftThread: unknown,
): draftThread is NonNullable<typeof draftThread> {
  return draftThread != null;
}

export function docsCommentsLayoutMediaQueries() {
  return {
    drawer: `(max-width: ${DOCS_COMMENTS_COMPACT_MIN - 1}px)`,
    sidebar: `(min-width: ${DOCS_COMMENTS_COMPACT_MIN}px)`,
  };
}

export function useDocsCommentsLayout(): DocsCommentsLayoutMode {
  const [layout, setLayout] = React.useState<DocsCommentsLayoutMode>(() =>
    typeof window === "undefined" ? "sidebar" : resolveDocsCommentsLayoutMode(window.innerWidth),
  );

  React.useEffect(() => {
    const queries = docsCommentsLayoutMediaQueries();
    const mqlDrawer = window.matchMedia(queries.drawer);

    const sync = () => {
      setLayout(resolveDocsCommentsLayoutMode(window.innerWidth));
    };

    mqlDrawer.addEventListener("change", sync);
    sync();

    return () => {
      mqlDrawer.removeEventListener("change", sync);
    };
  }, []);

  return layout;
}

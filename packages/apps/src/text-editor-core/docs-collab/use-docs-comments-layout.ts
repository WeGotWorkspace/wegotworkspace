import * as React from "react";

/** Viewports below this width use the comments SideDrawer and hide the floating layer. */
export const DOCS_COMMENTS_COMPACT_MIN = 1160;

/**
 * Minimum viewport width for a centered document sheet with margin comments.
 * Derived from A4 sheet (~794px) plus comment column (20rem) and gap on each side.
 */
export const DOCS_COMMENTS_CENTERED_SHEET_MIN_WIDTH = 1472;

export type DocsCommentsLayoutMode = "drawer" | "margin-compact" | "margin-wide";

export function resolveDocsCommentsLayoutMode(width: number): DocsCommentsLayoutMode {
  if (width < DOCS_COMMENTS_COMPACT_MIN) return "drawer";
  if (width < DOCS_COMMENTS_CENTERED_SHEET_MIN_WIDTH) return "margin-compact";
  return "margin-wide";
}

/** Shift the document sheet left only when margin comments are visible in the compact tier. */
export function shouldApplyCommentsSheetCompact(
  layoutMode: DocsCommentsLayoutMode,
  commentsOpen: boolean,
): boolean {
  return commentsOpen && layoutMode === "margin-compact";
}

/** Margin tiers show comments on load; drawer tier keeps them closed until the user opens them. */
export function shouldDefaultCommentsOpen(layoutMode: DocsCommentsLayoutMode): boolean {
  return layoutMode !== "drawer";
}

/** Auto-open when threads appear applies only outside the drawer tier. */
export function shouldAutoOpenCommentsForThreads(layoutMode: DocsCommentsLayoutMode): boolean {
  return layoutMode !== "drawer";
}

/** Draft compose always opens the active comments surface (margin layer or drawer). */
export function shouldAutoOpenCommentsForDraft(
  draftThread: unknown,
): draftThread is NonNullable<typeof draftThread> {
  return draftThread != null;
}

export function docsCommentsLayoutMediaQueries() {
  return {
    drawer: `(max-width: ${DOCS_COMMENTS_COMPACT_MIN - 1}px)`,
    marginCompact: `(min-width: ${DOCS_COMMENTS_COMPACT_MIN}px) and (max-width: ${DOCS_COMMENTS_CENTERED_SHEET_MIN_WIDTH - 1}px)`,
    marginWide: `(min-width: ${DOCS_COMMENTS_CENTERED_SHEET_MIN_WIDTH}px)`,
  };
}

export function useDocsCommentsLayout(): DocsCommentsLayoutMode {
  const [layout, setLayout] = React.useState<DocsCommentsLayoutMode>(() =>
    typeof window === "undefined"
      ? "margin-wide"
      : resolveDocsCommentsLayoutMode(window.innerWidth),
  );

  React.useEffect(() => {
    const queries = docsCommentsLayoutMediaQueries();
    const mqlDrawer = window.matchMedia(queries.drawer);
    const mqlCompact = window.matchMedia(queries.marginCompact);

    const sync = () => {
      setLayout(resolveDocsCommentsLayoutMode(window.innerWidth));
    };

    mqlDrawer.addEventListener("change", sync);
    mqlCompact.addEventListener("change", sync);
    sync();

    return () => {
      mqlDrawer.removeEventListener("change", sync);
      mqlCompact.removeEventListener("change", sync);
    };
  }, []);

  return layout;
}

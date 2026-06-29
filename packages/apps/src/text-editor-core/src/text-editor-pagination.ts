import type { AnyExtension, Editor } from "@tiptap/react";
import { PAGE_SIZES, PaginationPlus } from "tiptap-pagination-plus";
import { resolveTextEditorSheetMarginPx } from "@/text-editor-core/src/text-editor-sheet-margin";

/**
 * Page margins match the continuous sheet padding token
 * (`--text-editor-sheet-padding` on `.text-editor`). We keep a single consistent
 * margin across formats instead of the plugin's per-format margins so the
 * writing inset stays identical to the non-paginated sheet and print `@page`.
 */
/** Screen gap height — keep in sync with `--text-editor-page-gap-size` in text-editor.css. */
const PAGE_GAP = 32;

/** Selectable page formats. `a4` is the default; pagination is visual-only. */
export type TextEditorPageFormat = "a4" | "letter" | "legal" | "a3" | "a5";

export const DEFAULT_TEXT_EDITOR_PAGE_FORMAT: TextEditorPageFormat = "a4";

export type TextEditorPageFormatOption = {
  id: TextEditorPageFormat;
  /** Human-readable name shown in the picker. */
  label: string;
  /** Page box width / height in px @96dpi. */
  width: number;
  height: number;
};

/**
 * Common page sizes. Geometry is sourced from the plugin's exported
 * {@link PAGE_SIZES} (px @96dpi) so the columns match the library's layout
 * maths; margins are overridden to the shared sheet inset (see SHEET_MARGIN).
 */
export const TEXT_EDITOR_PAGE_FORMATS: readonly TextEditorPageFormatOption[] = [
  { id: "a4", label: "A4", width: PAGE_SIZES.A4.pageWidth, height: PAGE_SIZES.A4.pageHeight },
  {
    id: "letter",
    label: "US Letter",
    width: PAGE_SIZES.LETTER.pageWidth,
    height: PAGE_SIZES.LETTER.pageHeight,
  },
  {
    id: "legal",
    label: "US Legal",
    width: PAGE_SIZES.LEGAL.pageWidth,
    height: PAGE_SIZES.LEGAL.pageHeight,
  },
  { id: "a3", label: "A3", width: PAGE_SIZES.A3.pageWidth, height: PAGE_SIZES.A3.pageHeight },
  { id: "a5", label: "A5", width: PAGE_SIZES.A5.pageWidth, height: PAGE_SIZES.A5.pageHeight },
] as const;

function pageFormatOption(format: TextEditorPageFormat): TextEditorPageFormatOption {
  return (
    TEXT_EDITOR_PAGE_FORMATS.find((option) => option.id === format) ?? TEXT_EDITOR_PAGE_FORMATS[0]
  );
}

/** Page box width (px) for a format — drives the `--text-editor-page-width` CSS var. */
export function textEditorPageWidth(format: TextEditorPageFormat): number {
  return pageFormatOption(format).width;
}

/** `data-*` attribute set on `html`/`body` during Docs print (see `text-editor-print.ts`). */
export const TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR = "data-text-editor-page-format";

/** Named `@page` rule suffix for each selectable format (CSS `page` property). */
export function textEditorPrintPageName(format: TextEditorPageFormat): string {
  return `text-editor-${format}`;
}

function pageSizeFor(format: TextEditorPageFormat, scope?: Element | null) {
  const { width, height } = pageFormatOption(format);
  const margin = resolveTextEditorSheetMarginPx(scope);
  return {
    pageWidth: width,
    pageHeight: height,
    marginTop: margin,
    marginBottom: margin,
    marginLeft: margin,
    marginRight: margin,
  };
}

/**
 * {@link PaginationPlus} configuration for the Docs sheet, sized to `format`
 * (default A4). Gap and border colors are token-driven so the parent workspace
 * owns the cream gutter / page chrome (`--text-editor-page-gap`,
 * `--text-editor-page-gap-border`). Header/footer slots are cleared for now
 * (no page numbers); set `footerRight: "{page}"` later to re-enable.
 *
 * Pagination is purely visual — it adds ProseMirror decorations and never
 * mutates the stored Markdown / HTML / Yjs document.
 */
export function createTextEditorPaginationExtension(
  format: TextEditorPageFormat = DEFAULT_TEXT_EDITOR_PAGE_FORMAT,
  scope?: Element | null,
): AnyExtension {
  return PaginationPlus.configure({
    ...pageSizeFor(format, scope),
    contentMarginTop: 0,
    contentMarginBottom: 0,
    pageGap: PAGE_GAP,
    pageGapBorderSize: 1,
    pageGapBorderColor: "var(--text-editor-page-gap-border, rgba(15, 23, 42, 0.12))",
    pageBreakBackground: "var(--text-editor-page-gap, #e7e4dc)",
    headerLeft: "",
    headerRight: "",
    footerLeft: "",
    footerRight: "",
  });
}

/** Inline vars PaginationPlus sets on `.ProseMirror`; stale entries break round-trip layout. */
const PAGINATION_CONTENT_HEIGHT_VAR_PREFIX = "--rm-page-content";

/** Remove plugin-managed per-page content height vars from the ProseMirror root. */
export function clearTextEditorPaginationContentVariables(dom: HTMLElement): void {
  const toRemove: string[] = [];
  for (let i = 0; i < dom.style.length; i += 1) {
    const name = dom.style.item(i);
    if (
      name.startsWith(PAGINATION_CONTENT_HEIGHT_VAR_PREFIX) ||
      name === "--rm-max-content-child-height"
    ) {
      toRemove.push(name);
    }
  }
  for (const name of toRemove) {
    dom.style.removeProperty(name);
  }
}

function resetTextEditorPaginationStorage(editor: Editor): void {
  const storage = editor.storage.PaginationPlus;
  if (!storage) return;
  storage.headerHeight = new Map();
  storage.footerHeight = new Map();
}

/**
 * Re-size an already-mounted paginated editor live (no re-create), preserving
 * cursor, undo history, and the collab session. No-op when the pagination
 * extension is absent.
 */
export function applyTextEditorPageFormat(editor: Editor, format: TextEditorPageFormat): void {
  if (!editor.storage.PaginationPlus) return;
  const scope = editor.view.dom.closest(".text-editor");
  const { dom } = editor.view;

  clearTextEditorPaginationContentVariables(dom);
  resetTextEditorPaginationStorage(editor);

  editor.commands.updatePageSize(pageSizeFor(format, scope));
  // Storage-only command — dispatch so decorations rebuild from fresh measurements.
  editor.view.dispatch(editor.state.tr);
}

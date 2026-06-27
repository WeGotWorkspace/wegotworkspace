import type { AnyExtension, Editor } from "@tiptap/react";
import { PAGE_SIZES, PaginationPlus } from "tiptap-pagination-plus";

/**
 * Page margins (px @96dpi) match the continuous sheet padding token
 * (`--text-editor-sheet-padding: 0.75in`). We keep a single consistent margin
 * across formats instead of the plugin's per-format margins so the writing
 * inset stays identical to the non-paginated sheet.
 */
const SHEET_MARGIN = 72; // 0.75in × 96dpi
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

function pageSizeFor(format: TextEditorPageFormat) {
  const { width, height } = pageFormatOption(format);
  return {
    pageWidth: width,
    pageHeight: height,
    marginTop: SHEET_MARGIN,
    marginBottom: SHEET_MARGIN,
    marginLeft: SHEET_MARGIN,
    marginRight: SHEET_MARGIN,
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
): AnyExtension {
  return PaginationPlus.configure({
    ...pageSizeFor(format),
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

/**
 * Re-size an already-mounted paginated editor live (no re-create), preserving
 * cursor, undo history, and the collab session. No-op when the pagination
 * extension is absent.
 */
export function applyTextEditorPageFormat(editor: Editor, format: TextEditorPageFormat): void {
  if (!editor.storage.PaginationPlus) return;
  editor.commands.updatePageSize(pageSizeFor(format));
}

import type { AnyExtension } from "@tiptap/react";
import { PaginationPlus } from "tiptap-pagination-plus";

/**
 * US Letter geometry at 96dpi, aligned with the `.text-editor-sheet` tokens
 * (`max-width: 8.5in`, `--text-editor-sheet-padding: 0.75in`). Pagination is
 * purely visual — it adds ProseMirror decorations and never mutates the
 * stored Markdown / HTML / Yjs document.
 */
const LETTER_PAGE_WIDTH = 816; // 8.5in × 96dpi
const LETTER_PAGE_HEIGHT = 1056; // 11in × 96dpi
const SHEET_MARGIN = 72; // 0.75in × 96dpi — matches --text-editor-sheet-padding
const PAGE_GAP = 32;

/**
 * Letter-sized {@link PaginationPlus} configuration for the Docs letter sheet.
 *
 * Gap and border colors are token-driven so the parent workspace owns the
 * cream gutter / page chrome (`--text-editor-page-gap`,
 * `--text-editor-page-gap-border`). Only a page-number footer is rendered;
 * the upstream demo header/footer chrome is intentionally cleared.
 */
export function createTextEditorPaginationExtension(): AnyExtension {
  return PaginationPlus.configure({
    pageWidth: LETTER_PAGE_WIDTH,
    pageHeight: LETTER_PAGE_HEIGHT,
    marginTop: SHEET_MARGIN,
    marginBottom: SHEET_MARGIN,
    marginLeft: SHEET_MARGIN,
    marginRight: SHEET_MARGIN,
    contentMarginTop: 0,
    contentMarginBottom: 0,
    pageGap: PAGE_GAP,
    pageGapBorderSize: 1,
    pageGapBorderColor: "var(--text-editor-page-gap-border, rgba(15, 23, 42, 0.12))",
    pageBreakBackground: "var(--text-editor-page-gap, #e7e4dc)",
    headerLeft: "",
    headerRight: "",
    footerLeft: "",
    footerRight: "{page}",
  });
}

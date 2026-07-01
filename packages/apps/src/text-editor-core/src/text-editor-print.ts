import type { Editor } from "@tiptap/react";
import { readTextEditorSheetPaddingToken } from "@/text-editor-core/src/text-editor-sheet-margin";
import { readTextEditorProseFontSizeToken } from "@/text-editor-core/src/text-editor-prose-font";

const PRINT_BODY_CLASS = "text-editor-print-active";
const PRINT_SURFACE_CLASS = "text-editor-sheet__surface--print";
/** Applied to `.text-editor` during print so view-source split prints formatted content only. */
export const TEXT_EDITOR_PRINT_FORMATTED_CLASS = "text-editor--print-formatted";
/** Mirrored on `html` during print so `@page` can read the sheet padding token. */
const PRINT_PAGE_MARGIN_VAR = "--text-editor-print-page-margin";
/** Mirrored on `html` during print so print typography matches the on-screen prose scale. */
const PRINT_PROSE_FONT_SIZE_VAR = "--text-editor-print-prose-font-size";

function findPrintSurface(editor: Editor): HTMLElement | null {
  const editorRoot = editor.view.dom.closest(".text-editor");
  if (!editorRoot) return null;

  // Always print the formatted WYSIWYG sheet — never the Markdown/HTML source pane.
  const formattedSurface = editorRoot.querySelector<HTMLElement>(
    ".text-editor__formatted .text-editor-sheet__surface",
  );
  if (formattedSurface) return formattedSurface;

  return editorRoot.querySelector<HTMLElement>(".text-editor-sheet__surface");
}

/** Mirror `--text-editor-sheet-padding` onto `html` for `@page` margin scope. */
function syncPrintPageMarginToken(editorRoot: Element | null): () => void {
  const root = document.documentElement;
  const previous = root.style.getPropertyValue(PRINT_PAGE_MARGIN_VAR);
  const token = readTextEditorSheetPaddingToken(editorRoot);
  root.style.setProperty(PRINT_PAGE_MARGIN_VAR, token);

  return () => {
    if (previous) {
      root.style.setProperty(PRINT_PAGE_MARGIN_VAR, previous);
    } else {
      root.style.removeProperty(PRINT_PAGE_MARGIN_VAR);
    }
  };
}

/** Mirror `--text-editor-prose-font-size` onto `html` for print typography scope. */
function syncPrintProseFontToken(editorRoot: Element | null): () => void {
  const root = document.documentElement;
  const previous = root.style.getPropertyValue(PRINT_PROSE_FONT_SIZE_VAR);
  const token = readTextEditorProseFontSizeToken(editorRoot);
  root.style.setProperty(PRINT_PROSE_FONT_SIZE_VAR, token);

  return () => {
    if (previous) {
      root.style.setProperty(PRINT_PROSE_FONT_SIZE_VAR, previous);
    } else {
      root.style.removeProperty(PRINT_PROSE_FONT_SIZE_VAR);
    }
  };
}

/**
 * Print the editor sheet from the live document so fonts and styles match the UI.
 * Uses print-only CSS on `body` (see `text-editor.css`) — no iframe.
 */
export function printTextEditorSheet(editor: Editor | null) {
  if (!editor) return;

  const surface = findPrintSurface(editor);
  if (!surface) {
    window.print();
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  const editorRoot = surface.closest(".text-editor");

  let restorePrintPageMargin: (() => void) | null = null;
  let restorePrintProseFont: (() => void) | null = null;

  root.classList.add(PRINT_BODY_CLASS);
  body.classList.add(PRINT_BODY_CLASS);
  surface.classList.add(PRINT_SURFACE_CLASS);
  editorRoot?.classList.add(TEXT_EDITOR_PRINT_FORMATTED_CLASS);

  restorePrintPageMargin = syncPrintPageMarginToken(editorRoot);
  restorePrintProseFont = syncPrintProseFontToken(editorRoot);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    restorePrintPageMargin?.();
    restorePrintProseFont?.();
    root.classList.remove(PRINT_BODY_CLASS);
    body.classList.remove(PRINT_BODY_CLASS);
    surface.classList.remove(PRINT_SURFACE_CLASS);
    editorRoot?.classList.remove(TEXT_EDITOR_PRINT_FORMATTED_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 120_000);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

import type { Editor } from "@tiptap/react";
import {
  TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR,
  type TextEditorPageFormat,
} from "@/text-editor-core/src/text-editor-pagination";

const PRINT_BODY_CLASS = "text-editor-print-active";
const PRINT_SURFACE_CLASS = "text-editor-sheet__surface--print";
/** Applied to `.text-editor` during print so view-source split prints formatted content only. */
export const TEXT_EDITOR_PRINT_FORMATTED_CLASS = "text-editor--print-formatted";

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

/**
 * Print the editor sheet from the live document so fonts and styles match the UI.
 * Uses print-only CSS on `body` (see `text-editor.css`) — no iframe.
 *
 * When `pageFormat` is provided (Docs paginated editor), sets
 * {@link TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR} on `html`/`body` for the print
 * lifecycle so `@page` size matches the footer selection (A4, Letter, etc.).
 */
export function printTextEditorSheet(editor: Editor | null, pageFormat?: TextEditorPageFormat) {
  if (!editor) return;

  const surface = findPrintSurface(editor);
  if (!surface) {
    window.print();
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  const editorRoot = surface.closest(".text-editor");
  root.classList.add(PRINT_BODY_CLASS);
  body.classList.add(PRINT_BODY_CLASS);
  surface.classList.add(PRINT_SURFACE_CLASS);
  editorRoot?.classList.add(TEXT_EDITOR_PRINT_FORMATTED_CLASS);

  if (pageFormat) {
    root.setAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR, pageFormat);
    body.setAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR, pageFormat);
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    root.classList.remove(PRINT_BODY_CLASS);
    body.classList.remove(PRINT_BODY_CLASS);
    surface.classList.remove(PRINT_SURFACE_CLASS);
    editorRoot?.classList.remove(TEXT_EDITOR_PRINT_FORMATTED_CLASS);
    root.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    body.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 120_000);

  window.print();
}

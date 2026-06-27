import type { Editor } from "@tiptap/react";
import {
  TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR,
  type TextEditorPageFormat,
} from "@/text-editor-core/src/text-editor-pagination";

const PRINT_BODY_CLASS = "text-editor-print-active";
const PRINT_SURFACE_CLASS = "text-editor-sheet__surface--print";

function findPrintSurface(editor: Editor): HTMLElement | null {
  const editorRoot = editor.view.dom.closest(".text-editor");
  if (!editorRoot) return null;

  if (editorRoot.classList.contains("text-editor--view-source")) {
    return editorRoot.querySelector<HTMLElement>(
      ".text-editor__formatted .text-editor-sheet__surface",
    );
  }

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
  root.classList.add(PRINT_BODY_CLASS);
  body.classList.add(PRINT_BODY_CLASS);
  surface.classList.add(PRINT_SURFACE_CLASS);

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
    root.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    body.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 120_000);

  window.print();
}

import type { Editor } from "@tiptap/react";

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

/** Print only the letter sheet surface for this editor instance. */
export function printTextEditorSheet(editor: Editor | null) {
  if (!editor) return;

  const surface = findPrintSurface(editor);

  if (!surface) {
    window.print();
    return;
  }

  const body = document.body;
  body.classList.add(PRINT_BODY_CLASS);
  surface.classList.add(PRINT_SURFACE_CLASS);

  const cleanup = () => {
    body.classList.remove(PRINT_BODY_CLASS);
    surface.classList.remove(PRINT_SURFACE_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}

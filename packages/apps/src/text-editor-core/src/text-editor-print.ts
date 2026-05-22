import type { Editor } from "@tiptap/react";

const PRINT_BODY_CLASS = "text-editor-print-active";

/** Print only the letter sheet surface for this editor instance. */
export function printTextEditorSheet(editor: Editor | null) {
  if (!editor) return;

  const surface = editor.view.dom
    .closest(".text-editor")
    ?.querySelector(".text-editor-sheet__surface");

  if (!surface) {
    window.print();
    return;
  }

  const body = document.body;
  body.classList.add(PRINT_BODY_CLASS);

  const cleanup = () => {
    body.classList.remove(PRINT_BODY_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}

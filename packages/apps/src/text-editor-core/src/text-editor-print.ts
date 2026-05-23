import type { Editor } from "@tiptap/react";

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

function collectStylesheetLinks(): string {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .filter((link) => Boolean(link.href) && link.href.startsWith(window.location.origin))
    .map((link) => `<link rel="stylesheet" href="${link.href}" />`)
    .join("\n");
}

function waitForPrintFrame(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    const doc = iframe.contentDocument;
    if (!doc) {
      resolve();
      return;
    }

    const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    if (links.length === 0) {
      resolve();
      return;
    }

    let pending = links.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0) resolve();
    };

    for (const link of links) {
      if (link.sheet) {
        done();
        continue;
      }
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
    }

    window.setTimeout(resolve, 800);
  });
}

function buildPrintDocument(surface: HTMLElement): string {
  const prose = surface.querySelector(".ProseMirror");
  const content = prose
    ? `<div class="${prose.className}">${prose.innerHTML}</div>`
    : surface.innerHTML;
  const sheetClass = surface.className || "text-editor-sheet__surface";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print</title>
    ${collectStylesheetLinks()}
    <style>
      @page { margin: 1in; }
      body { margin: 0; background: white; }
      .text-editor-print-surface {
        box-shadow: none !important;
        max-width: none !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    </style>
  </head>
  <body>
    <div class="${sheetClass} text-editor-print-surface">${content}</div>
  </body>
</html>`;
}

/** Print only the letter sheet surface for this editor instance. */
export function printTextEditorSheet(editor: Editor | null) {
  if (!editor) return;

  const surface = findPrintSurface(editor);
  if (!surface) {
    window.print();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(buildPrintDocument(surface));
  doc.close();

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    iframe.remove();
    win.removeEventListener("afterprint", cleanup);
  };

  win.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 120_000);

  void waitForPrintFrame(iframe).then(() => {
    win.focus();
    win.print();
  });
}

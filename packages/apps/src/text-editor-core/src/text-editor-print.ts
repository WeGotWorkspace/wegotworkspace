import type { Editor } from "@tiptap/react";
import {
  TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR,
  type TextEditorPageFormat,
} from "@/text-editor-core/src/text-editor-pagination";
import { readTextEditorSheetPaddingToken } from "@/text-editor-core/src/text-editor-sheet-margin";
import { readTextEditorProseFontSizeToken } from "@/text-editor-core/src/text-editor-prose-font";

const PRINT_BODY_CLASS = "text-editor-print-active";
const PRINT_SURFACE_CLASS = "text-editor-sheet__surface--print";
/** Applied to `.text-editor` during print so view-source split prints formatted content only. */
export const TEXT_EDITOR_PRINT_FORMATTED_CLASS = "text-editor--print-formatted";
/**
 * Paginated Docs print: strip plugin chrome in CSS, mirror screen page breaks onto
 * content nodes, and reflow through `@page` margins (see `text-editor.css`).
 */
export const TEXT_EDITOR_PRINT_PAGINATED_CLASS = "text-editor-print-paginated";
/** Marks the first substantive content node on screen page 2+ during print. */
export const TEXT_EDITOR_PRINT_PAGE_START_CLASS = "text-editor-print-page-start";
/** Mirrored on `html` during print so `@page` can read the sheet padding token. */
const PRINT_PAGE_MARGIN_VAR = "--text-editor-print-page-margin";
/** Mirrored on `html` during print so print typography matches the on-screen prose scale. */
const PRINT_PROSE_FONT_SIZE_VAR = "--text-editor-print-prose-font-size";

const PAGINATED_CONTENT_SELECTOR = ":scope > :not([data-rm-pagination]):not(.rm-first-page-header)";

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

/** Ignore empty trailing paragraphs — they sit in the phantom page band and block cleanup. */
function isSubstantivePaginatedContentNode(node: HTMLElement): boolean {
  const text = node.textContent?.replace(/\u200b/g, "").trim() ?? "";
  return text.length > 0;
}

function paginatedContentNodes(proseMirror: HTMLElement): HTMLElement[] {
  return [...proseMirror.querySelectorAll<HTMLElement>(PAGINATED_CONTENT_SELECTOR)].filter(
    isSubstantivePaginatedContentNode,
  );
}

function pageBandMidpoint(node: HTMLElement): number {
  const rect = node.getBoundingClientRect();
  return (rect.top + rect.bottom) / 2;
}

function setPrintPageStartBreak(node: HTMLElement): void {
  node.classList.add(TEXT_EDITOR_PRINT_PAGE_START_CLASS);
  node.style.setProperty("break-before", "page", "important");
  node.style.setProperty("page-break-before", "always", "important");
}

function clearPrintPageStartBreak(node: HTMLElement): void {
  node.classList.remove(TEXT_EDITOR_PRINT_PAGE_START_CLASS);
  node.style.removeProperty("break-before");
  node.style.removeProperty("page-break-before");
}

/**
 * Measure on the screen layout (before print classes): indices of the first
 * substantive content node on each screen page 2+.
 */
export function computePaginatedPrintPageStartIndices(proseMirror: HTMLElement): number[] {
  const pagesRoot = proseMirror.querySelector("[data-rm-pagination]");
  const pageBreaks = pagesRoot
    ? ([...pagesRoot.querySelectorAll(".rm-page-break")] as HTMLElement[])
    : [];
  if (pageBreaks.length === 0) return [];

  const contentNodes = paginatedContentNodes(proseMirror);
  const startIndices: number[] = [];

  for (let index = 1; index < pageBreaks.length; index++) {
    const bandTop =
      pageBreaks[index - 1].querySelector(".rm-page-footer")?.getBoundingClientRect().bottom ??
      proseMirror.getBoundingClientRect().top;
    const bandBottom =
      pageBreaks[index].querySelector(".rm-page-footer")?.getBoundingClientRect().top ??
      proseMirror.getBoundingClientRect().bottom;

    const nodeIndex = contentNodes.findIndex((node) => {
      const mid = pageBandMidpoint(node);
      return mid >= bandTop && mid <= bandBottom;
    });

    if (nodeIndex >= 0) startIndices.push(nodeIndex);
  }

  return startIndices;
}

/** Content nodes that begin screen page 2+ (re-query live DOM — do not cache refs). */
export function resolvePaginatedPrintPageStartNodes(
  proseMirror: HTMLElement,
  startIndices: readonly number[],
): HTMLElement[] {
  const contentNodes = paginatedContentNodes(proseMirror);
  return startIndices
    .map((nodeIndex) => contentNodes[nodeIndex])
    .filter((node): node is HTMLElement => node instanceof HTMLElement);
}

/** Screen page 2+ starts from the current layout (indices + live nodes). */
export function computePaginatedPrintPageStartNodes(proseMirror: HTMLElement): HTMLElement[] {
  return resolvePaginatedPrintPageStartNodes(
    proseMirror,
    computePaginatedPrintPageStartIndices(proseMirror),
  );
}

/** Apply print page breaks to content nodes captured from the screen layout. */
export function applyPaginatedPrintPageStarts(
  proseMirror: HTMLElement,
  startNodes: readonly HTMLElement[],
): () => void {
  const marked: HTMLElement[] = [];

  startNodes.forEach((node) => {
    if (!proseMirror.contains(node)) return;
    setPrintPageStartBreak(node);
    marked.push(node);
  });

  return () => {
    marked.forEach(clearPrintPageStartBreak);
  };
}

/** Clear plugin inline sizing so print reflow matches `@page` geometry. */
export function preparePaginatedPrintLayout(proseMirror: HTMLElement): () => void {
  const previousMinHeight = proseMirror.style.minHeight;
  const previousWidth = proseMirror.style.width;

  proseMirror.style.setProperty("min-height", "0", "important");
  proseMirror.style.setProperty("height", "auto", "important");
  // Keep plugin `--rm-page-width` / `--rm-margin-*` for print CSS width maths.
  proseMirror.style.removeProperty("width");

  proseMirror.getBoundingClientRect();
  void proseMirror.offsetHeight;

  return () => {
    proseMirror.style.removeProperty("min-height");
    proseMirror.style.removeProperty("height");
    proseMirror.style.removeProperty("width");
    if (previousMinHeight) {
      proseMirror.style.minHeight = previousMinHeight;
    }
    if (previousWidth) {
      proseMirror.style.width = previousWidth;
    }
  };
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
  const paginatedPrint =
    Boolean(pageFormat) && Boolean(surface.querySelector(".ProseMirror.rm-with-pagination"));
  const proseMirror = surface.querySelector<HTMLElement>(".ProseMirror.rm-with-pagination");

  // Capture screen page boundaries before print-only CSS reflows the column.
  // Store indices only — `preparePaginatedPrintLayout` can replace ProseMirror nodes.
  const paginatedPageStartIndices =
    paginatedPrint && proseMirror ? computePaginatedPrintPageStartIndices(proseMirror) : [];

  let restorePaginatedLayout: (() => void) | null = null;
  let restorePrintPageMargin: (() => void) | null = null;
  let restorePrintProseFont: (() => void) | null = null;

  const applyPaginatedPrintLayout = () => {
    if (!paginatedPrint || !proseMirror) return;
    restorePaginatedLayout?.();
    const restoreLayout = preparePaginatedPrintLayout(proseMirror);
    const startNodes = resolvePaginatedPrintPageStartNodes(proseMirror, paginatedPageStartIndices);
    const restoreBreaks = applyPaginatedPrintPageStarts(proseMirror, startNodes);
    restorePaginatedLayout = () => {
      restoreBreaks();
      restoreLayout();
    };
  };

  root.classList.add(PRINT_BODY_CLASS);
  body.classList.add(PRINT_BODY_CLASS);
  surface.classList.add(PRINT_SURFACE_CLASS);
  editorRoot?.classList.add(TEXT_EDITOR_PRINT_FORMATTED_CLASS);
  if (paginatedPrint) {
    root.classList.add(TEXT_EDITOR_PRINT_PAGINATED_CLASS);
    body.classList.add(TEXT_EDITOR_PRINT_PAGINATED_CLASS);
  }

  if (pageFormat) {
    root.setAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR, pageFormat);
    body.setAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR, pageFormat);
  }

  restorePrintPageMargin = syncPrintPageMarginToken(editorRoot);
  restorePrintProseFont = syncPrintProseFontToken(editorRoot);

  const onBeforePrint = () => {
    applyPaginatedPrintLayout();
  };

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    window.removeEventListener("beforeprint", onBeforePrint);
    restorePaginatedLayout?.();
    restorePrintPageMargin?.();
    restorePrintProseFont?.();
    root.classList.remove(PRINT_BODY_CLASS);
    body.classList.remove(PRINT_BODY_CLASS);
    surface.classList.remove(PRINT_SURFACE_CLASS);
    editorRoot?.classList.remove(TEXT_EDITOR_PRINT_FORMATTED_CLASS);
    root.classList.remove(TEXT_EDITOR_PRINT_PAGINATED_CLASS);
    body.classList.remove(TEXT_EDITOR_PRINT_PAGINATED_CLASS);
    root.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    body.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("beforeprint", onBeforePrint);
  window.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 120_000);

  applyPaginatedPrintLayout();

  // Let print-only CSS + page-start markers settle before the preview opens.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

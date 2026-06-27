/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Editor } from "@tiptap/react";
import {
  TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR,
  textEditorPrintPageName,
} from "./text-editor-pagination";
import {
  printTextEditorSheet,
  TEXT_EDITOR_PRINT_FORMATTED_CLASS,
  TEXT_EDITOR_PRINT_PAGINATED_CLASS,
  TEXT_EDITOR_PRINT_PAGE_START_CLASS,
  preparePaginatedPrintLayout,
  computePaginatedPrintPageStartIndices,
  computePaginatedPrintPageStartNodes,
  resolvePaginatedPrintPageStartNodes,
  applyPaginatedPrintPageStarts,
} from "./text-editor-print";

function createMockEditor(editorRoot: HTMLElement, proseMirror?: HTMLElement): Editor {
  const dom = proseMirror ?? editorRoot.querySelector(".ProseMirror") ?? editorRoot;
  return {
    view: {
      dom,
    },
  } as Editor;
}

function buildEditorDom(options?: { viewSource?: boolean; hideFormatted?: boolean }) {
  const source = document.createElement("div");
  source.className = "text-editor__source text-editor-source";
  source.textContent = "# Markdown source";

  const formatted = document.createElement("div");
  formatted.className = "text-editor__formatted";
  if (options?.hideFormatted) {
    formatted.style.display = "none";
  }

  const sheet = document.createElement("div");
  sheet.className = "text-editor-sheet text-editor-sheet--fill";
  const surface = document.createElement("div");
  surface.className = "text-editor-sheet__surface";
  const prose = document.createElement("div");
  prose.className = "ProseMirror text-editor-prose";
  prose.textContent = "Formatted document body";
  surface.appendChild(prose);
  sheet.appendChild(surface);
  formatted.appendChild(sheet);

  const body = document.createElement("div");
  body.className = "text-editor__body";
  body.appendChild(source);
  body.appendChild(formatted);

  const editorRoot = document.createElement("div");
  editorRoot.className = cn("text-editor", options?.viewSource && "text-editor--view-source");
  editorRoot.appendChild(body);
  document.body.appendChild(editorRoot);

  return { editorRoot, surface, source, formatted, prose };
}

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

describe("text editor pagination print helpers", () => {
  it("maps each selectable format to a named @page rule", () => {
    expect(textEditorPrintPageName("a4")).toBe("text-editor-a4");
    expect(textEditorPrintPageName("letter")).toBe("text-editor-letter");
    expect(textEditorPrintPageName("legal")).toBe("text-editor-legal");
    expect(textEditorPrintPageName("a3")).toBe("text-editor-a3");
    expect(textEditorPrintPageName("a5")).toBe("text-editor-a5");
  });
});

describe("printTextEditorSheet", () => {
  beforeEach(() => {
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("text-editor-print-active");
    document.documentElement.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    document.documentElement.style.removeProperty("--text-editor-print-page-margin");
    document.documentElement.style.removeProperty("--text-editor-print-prose-font-size");
    document.body.classList.remove("text-editor-print-active");
    document.body.removeAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR);
    document.documentElement.classList.remove(TEXT_EDITOR_PRINT_PAGINATED_CLASS);
    document.body.classList.remove(TEXT_EDITOR_PRINT_PAGINATED_CLASS);
    document
      .querySelectorAll(`.${TEXT_EDITOR_PRINT_FORMATTED_CLASS}`)
      .forEach((node) => node.classList.remove(TEXT_EDITOR_PRINT_FORMATTED_CLASS));
    document
      .querySelectorAll(`.${TEXT_EDITOR_PRINT_PAGE_START_CLASS}`)
      .forEach((node) => node.classList.remove(TEXT_EDITOR_PRINT_PAGE_START_CLASS));
  });

  it("sets the page-format data attribute during Docs print", () => {
    const surface = document.createElement("div");
    surface.className = "text-editor-sheet__surface";
    const editorRoot = document.createElement("div");
    editorRoot.className = "text-editor";
    editorRoot.appendChild(surface);
    document.body.appendChild(editorRoot);

    printTextEditorSheet(createMockEditor(editorRoot), "letter");

    expect(document.documentElement.getAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe("letter");
    expect(document.body.getAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe("letter");
    expect(document.documentElement.classList.contains("text-editor-print-active")).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--text-editor-print-page-margin")).toBe(
      "0.75in",
    );
    expect(
      document.documentElement.style.getPropertyValue("--text-editor-print-prose-font-size"),
    ).toBe("16px");

    editorRoot.remove();
  });

  it("prints the formatted sheet in view-source split layout", () => {
    const { editorRoot, surface, source, prose } = buildEditorDom({ viewSource: true });

    printTextEditorSheet(createMockEditor(editorRoot, prose), "a4");

    expect(surface.classList.contains("text-editor-sheet__surface--print")).toBe(true);
    expect(editorRoot.classList.contains(TEXT_EDITOR_PRINT_FORMATTED_CLASS)).toBe(true);
    expect(source.classList.contains("text-editor-sheet__surface--print")).toBe(false);

    editorRoot.remove();
  });

  it("finds the formatted sheet when the formatted pane is display:none (portrait source view)", () => {
    const { editorRoot, surface, prose } = buildEditorDom({
      viewSource: true,
      hideFormatted: true,
    });

    printTextEditorSheet(createMockEditor(editorRoot, prose));

    expect(surface.classList.contains("text-editor-sheet__surface--print")).toBe(true);
    expect(editorRoot.classList.contains(TEXT_EDITOR_PRINT_FORMATTED_CLASS)).toBe(true);

    editorRoot.remove();
  });

  it("enables paginated WYSIWYG print when pageFormat and plugin are present", () => {
    const { editorRoot, prose } = buildEditorDom({});
    prose.classList.add("rm-with-pagination");

    printTextEditorSheet(createMockEditor(editorRoot, prose), "a4");

    expect(document.body.classList.contains(TEXT_EDITOR_PRINT_PAGINATED_CLASS)).toBe(true);
    expect(document.documentElement.classList.contains(TEXT_EDITOR_PRINT_PAGINATED_CLASS)).toBe(
      true,
    );

    editorRoot.remove();
  });

  it("does not enable paginated print mode without pageFormat", () => {
    const { editorRoot, prose } = buildEditorDom({});
    prose.classList.add("rm-with-pagination");

    printTextEditorSheet(createMockEditor(editorRoot, prose));

    expect(document.body.classList.contains(TEXT_EDITOR_PRINT_PAGINATED_CLASS)).toBe(false);

    editorRoot.remove();
  });

  it("does not set the page-format attribute when format is omitted", () => {
    const surface = document.createElement("div");
    surface.className = "text-editor-sheet__surface";
    const editorRoot = document.createElement("div");
    editorRoot.className = "text-editor";
    editorRoot.appendChild(surface);
    document.body.appendChild(editorRoot);

    printTextEditorSheet(createMockEditor(editorRoot));

    expect(document.documentElement.hasAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe(false);
    expect(document.body.hasAttribute(TEXT_EDITOR_PAGE_FORMAT_DATA_ATTR)).toBe(false);

    editorRoot.remove();
  });
});

describe("preparePaginatedPrintLayout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clears plugin inline min-height and restores it on cleanup", () => {
    const prose = document.createElement("div");
    prose.className = "ProseMirror rm-with-pagination text-editor-prose";
    prose.style.minHeight = "calc(3400px + 2px)";
    prose.style.width = "794px";
    document.body.appendChild(prose);
    const originalMinHeight = prose.style.minHeight;

    const restore = preparePaginatedPrintLayout(prose);

    expect(prose.style.minHeight).toBe("0px");
    expect(prose.style.width).toBe("");

    restore();

    expect(prose.style.minHeight).toBe(originalMinHeight);
    expect(prose.style.width).toBe("794px");
  });
});

function mockRect(element: Element, rect: Partial<DOMRect>) {
  const full = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  } satisfies DOMRect;
  element.getBoundingClientRect = () => full;
}

function buildPaginatedPrintDom() {
  const prose = document.createElement("div");
  prose.className = "ProseMirror rm-with-pagination text-editor-prose";

  const firstHeader = document.createElement("div");
  firstHeader.className = "rm-first-page-header";
  mockRect(firstHeader, { top: 0, bottom: 72, height: 72 });

  const pages = document.createElement("div");
  pages.dataset.rmPagination = "true";

  const pageBreak = (footerTop: number) => {
    const brk = document.createElement("div");
    brk.className = "rm-page-break";
    const page = document.createElement("div");
    page.className = "page";
    mockRect(page, { top: footerTop - 979, bottom: footerTop, height: 979 });
    const breaker = document.createElement("div");
    breaker.className = "breaker";
    const footer = document.createElement("div");
    footer.className = "rm-page-footer";
    mockRect(footer, { top: footerTop, bottom: footerTop + 72, height: 72 });
    breaker.append(footer);
    brk.append(page, breaker);
    pages.appendChild(brk);
    return { brk, footerTop };
  };

  pageBreak(1100);
  pageBreak(2200);
  pageBreak(3300);

  const paragraph = document.createElement("p");
  paragraph.textContent = "Body copy on page one.";
  mockRect(paragraph, { top: 200, bottom: 240, height: 40 });

  const paragraph2 = document.createElement("p");
  paragraph2.textContent = "Body copy on page two.";
  mockRect(paragraph2, { top: 1500, bottom: 1540, height: 40 });

  prose.append(firstHeader, pages, paragraph, paragraph2);
  mockRect(prose, { top: 0, bottom: 3400, height: 3400 });

  document.body.appendChild(prose);
  return { prose, paragraph, paragraph2 };
}

describe("paginated print page-start helpers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("marks the first content node of screen page 2+ for print page breaks", () => {
    const { prose, paragraph2 } = buildPaginatedPrintDom();
    const indices = computePaginatedPrintPageStartIndices(prose);
    const startNodes = computePaginatedPrintPageStartNodes(prose);
    const restore = applyPaginatedPrintPageStarts(prose, startNodes);

    expect(indices).toEqual([1]);
    expect(startNodes).toEqual([paragraph2]);
    expect(paragraph2.classList.contains(TEXT_EDITOR_PRINT_PAGE_START_CLASS)).toBe(true);
    expect(paragraph2.style.breakBefore).toBe("page");

    restore();
    expect(paragraph2.classList.contains(TEXT_EDITOR_PRINT_PAGE_START_CLASS)).toBe(false);
    expect(paragraph2.style.breakBefore).toBe("");
  });

  it("re-resolves page-start nodes after layout prep so markers stay in the document", () => {
    const { prose } = buildPaginatedPrintDom();
    const indices = computePaginatedPrintPageStartIndices(prose);

    const restoreLayout = preparePaginatedPrintLayout(prose);
    const liveNodes = resolvePaginatedPrintPageStartNodes(prose, indices);
    const restoreBreaks = applyPaginatedPrintPageStarts(prose, liveNodes);

    expect(indices).toEqual([1]);
    expect(liveNodes).toHaveLength(1);
    expect(prose.contains(liveNodes[0])).toBe(true);
    expect(liveNodes[0].classList.contains(TEXT_EDITOR_PRINT_PAGE_START_CLASS)).toBe(true);
    expect(document.querySelectorAll(`.${TEXT_EDITOR_PRINT_PAGE_START_CLASS}`).length).toBe(1);

    restoreBreaks();
    restoreLayout();
  });
});

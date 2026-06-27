/** Fallback when `--text-editor-sheet-padding` is absent (matches `.text-editor` default). */
export const TEXT_EDITOR_SHEET_PADDING_FALLBACK = "0.75in";

let marginProbe: HTMLDivElement | null = null;

/** Convert a concrete CSS length token to px (@96dpi / root rem). */
function cssLengthToPx(length: string, rootFontSizePx = 16): number {
  const value = length.trim();
  const match = value.match(/^(-?[\d.]+)([a-z%]*)$/i);
  if (!match) return 0;

  const amount = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "px":
      return amount;
    case "in":
      return amount * 96;
    case "rem":
      return amount * rootFontSizePx;
    case "em":
      return amount * rootFontSizePx;
    case "pt":
      return amount * (96 / 72);
    case "cm":
      return amount * (96 / 2.54);
    case "mm":
      return amount * (96 / 25.4);
    default:
      return amount;
  }
}

/**
 * Resolve `--text-editor-sheet-padding` on `scope` (or `:root`) to px for plugin
 * layout maths. Screen pagination and print `@page` margins both derive from the
 * same CSS token — this helper keeps JS page-height calculations in sync.
 */
export function resolveTextEditorSheetMarginPx(scope: Element | null = null): number {
  if (typeof document === "undefined") {
    return cssLengthToPx(TEXT_EDITOR_SHEET_PADDING_FALLBACK);
  }

  const host = scope ?? document.documentElement;
  const token =
    getComputedStyle(host).getPropertyValue("--text-editor-sheet-padding").trim() ||
    TEXT_EDITOR_SHEET_PADDING_FALLBACK;

  if (!marginProbe) {
    marginProbe = document.createElement("div");
    marginProbe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    document.documentElement.appendChild(marginProbe);
  }

  marginProbe.style.paddingTop = token;
  const computed = getComputedStyle(marginProbe).paddingTop;
  marginProbe.style.paddingTop = "";

  if (computed.endsWith("px")) {
    return Number.parseFloat(computed);
  }

  const rootFontSizePx =
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return cssLengthToPx(token, rootFontSizePx);
}

/** Read the raw `--text-editor-sheet-padding` token for print `@page` sync. */
export function readTextEditorSheetPaddingToken(scope: Element | null = null): string {
  const host = scope ?? document.documentElement;
  return (
    getComputedStyle(host).getPropertyValue("--text-editor-sheet-padding").trim() ||
    TEXT_EDITOR_SHEET_PADDING_FALLBACK
  );
}

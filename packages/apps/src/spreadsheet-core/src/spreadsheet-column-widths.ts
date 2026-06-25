import { measureNaturalWidth, prepareWithSegments } from "@chenglou/pretext";
import { colLetter, formatValue, type ColumnSetting } from "@/spreadsheet-core/src/ycsv/ycsv";
import type { ComputedCell } from "@/spreadsheet-core/src/ycsv/ycsv-formula-engine";

export const MIN_COL_WIDTH = 64;
export const MAX_COL_WIDTH = 600;
export const COL_CELL_PAD = 28;
export const HEADER_BADGE_PAD = 12;

const GRID_FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const CELL_FONT = `13px ${GRID_FONT_FAMILY}`;
const HEADER_FONT = `600 13px ${GRID_FONT_FAMILY}`;

type Cell = { value?: string } | undefined;

const widthCache = new Map<string, number>();

/** Measure single-line text width via pretext (cached per font+text). */
export function measurePretextWidth(text: string, font: string): number {
  if (!text) return 0;
  const key = `${font}\0${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  const prepared = prepareWithSegments(text, font);
  const width = measureNaturalWidth(prepared);
  widthCache.set(key, width);
  return width;
}

/** Clear pretext width cache (e.g. when font metrics may have changed). */
export function clearSpreadsheetColumnWidthCache(): void {
  widthCache.clear();
}

/** Auto-size each column to the widest header or cell value (formatted display). */
export function computeAutoColumnWidths(
  colCount: number,
  columnSettings: ColumnSetting[],
  rawData: Cell[][],
  computed: ComputedCell[][],
  viewOffset: number,
): number[] {
  return Array.from({ length: colCount }, (_, i) => {
    const cs = columnSettings[i];
    const label = cs?.name || cs?.ref || colLetter(i);
    const badge = cs?.ref && cs.ref !== label ? cs.ref : "";
    let maxW = Math.max(
      measurePretextWidth(label, HEADER_FONT),
      badge ? measurePretextWidth(badge, CELL_FONT) + HEADER_BADGE_PAD : 0,
    );

    const headerCell = rawData[0]?.[i]?.value ?? "";
    if (headerCell) {
      maxW = Math.max(maxW, measurePretextWidth(headerCell, HEADER_FONT));
    }

    for (let r = viewOffset; r < rawData.length; r++) {
      const raw = rawData[r]?.[i]?.value ?? "";
      const isFormula = raw.startsWith("=");
      const isErr = !!computed[r]?.[i]?.error;
      const display = isFormula
        ? isErr
          ? (computed[r]?.[i]?.display ?? "")
          : formatValue(computed[r]?.[i]?.display ?? "", cs)
        : formatValue(raw, cs);
      maxW = Math.max(maxW, measurePretextWidth(display, CELL_FONT));
    }

    return Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, Math.ceil(maxW) + COL_CELL_PAD));
  });
}

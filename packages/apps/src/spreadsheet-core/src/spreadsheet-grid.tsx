import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  GridColumnIcon,
  type DataEditorRef,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type ProvideEditorCallback,
  type Rectangle,
} from "@glideapps/glide-data-grid";
import { cn } from "@/lib/utils";
import {
  colLetter,
  formatValue,
  type ColumnSetting,
  type Defs,
} from "@/spreadsheet-core/src/ycsv/ycsv";
import type { ComputedCell } from "@/spreadsheet-core/src/ycsv/ycsv-formula-engine";
import { FormulaTokens, tokenizeFormula } from "@/spreadsheet-core/src/formula-highlight";
import { computeSuggestions, SuggestionList } from "@/spreadsheet-core/src/formula-suggest";
import {
  SpreadsheetGridProvider,
  useSpreadsheetGridContext,
} from "@/spreadsheet-core/src/spreadsheet-grid-context";

import "@glideapps/glide-data-grid/dist/index.css";

type Cell = { value?: string } | undefined;

const FORMULA_COLOR = "#2563eb";
const ERROR_COLOR = "#dc2626";

export type SpreadsheetGridSelection =
  | null
  | { kind: "cell"; row: number; column: number }
  | { kind: "range"; start: { row: number; column: number }; end: { row: number; column: number } }
  | { kind: "rows"; start: number; end: number }
  | { kind: "cols"; start: number; end: number };

export type SpreadsheetGridProps = {
  /** Raw cell matrix (parent-coords incl. header row). */
  rawData: Cell[][];
  /** Resolved display values per cell (same shape as rawData). */
  computed: ComputedCell[][];
  columnSettings: ColumnSetting[];
  defs: Defs;
  /** First row index visible in the grid (1 when the header row is hidden). */
  viewOffset: number;
  /** Active cell in parent-coords, or null. */
  active: { row: number; column: number } | null;
  onActivateCell: (p: { row: number; column: number }) => void;
  onSelect: (sel: SpreadsheetGridSelection) => void;
  writeCell: (row: number, column: number, value: string) => void;
  /** When true, clicking cells inserts refs into the formula bar instead of editing. */
  picking: boolean;
};

/** Parse a raw formula into related-cell highlight regions (parent-coords). */
function parseFormulaRegions(
  raw: string,
  columnSettings: ColumnSetting[],
): { row: number; col: number; rows?: number; cols?: number }[] {
  if (!raw.startsWith("=")) return [];
  const consts = new Set<string>();
  const refs = new Set(columnSettings.filter((c) => c.ref).map((c) => c.ref!));
  const toks = tokenizeFormula(raw.slice(1), consts, refs);
  const refIdx = new Map<string, number>();
  columnSettings.forEach((c, i) => {
    if (c.ref) refIdx.set(c.ref, i);
  });
  const out: { row: number; col: number; rows?: number; cols?: number }[] = [];

  const letterCol = (s: string) => {
    let n = 0;
    for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const next = toks[i + 1];
    const after = toks[i + 2];
    if (t.type === "cellref") {
      const m = t.text.match(/^([A-Z]+)(\d+)$/);
      if (!m) continue;
      const c = letterCol(m[1]);
      const r = parseInt(m[2], 10) - 1;
      if (next?.type === "op" && next.text === ":" && after?.type === "cellref") {
        const m2 = after.text.match(/^([A-Z]+)(\d+)$/);
        if (m2) {
          const c2 = letterCol(m2[1]);
          const r2 = parseInt(m2[2], 10) - 1;
          out.push({
            row: Math.min(r, r2),
            col: Math.min(c, c2),
            rows: Math.abs(r2 - r) + 1,
            cols: Math.abs(c2 - c) + 1,
          });
          i += 2;
          continue;
        }
      }
      out.push({ row: r, col: c });
    } else if (t.type === "ref") {
      const m = t.text.match(/^([a-z][a-z0-9_]*?)(\d+)$/);
      if (m && refIdx.has(m[1])) {
        out.push({ row: parseInt(m[2], 10) - 1, col: refIdx.get(m[1])! });
      } else if (refIdx.has(t.text)) {
        out.push({ row: 0, col: refIdx.get(t.text)!, rows: 1_000_000 });
      }
    }
  }
  return out;
}

export function SpreadsheetGrid({
  rawData,
  computed,
  columnSettings,
  defs,
  viewOffset,
  active,
  onActivateCell,
  onSelect,
  writeCell,
  picking,
}: SpreadsheetGridProps) {
  const gridRef = useRef<DataEditorRef>(null);
  const colCount = rawData[0]?.length ?? columnSettings.length ?? 1;
  const rowCount = Math.max(0, rawData.length - viewOffset);

  const inferType = useCallback(
    (col: number): "string" | "number" => {
      let nums = 0;
      let strs = 0;
      for (let r = viewOffset; r < rawData.length; r++) {
        const v = (rawData[r]?.[col]?.value ?? "").trim();
        if (!v) continue;
        if (v.startsWith("=") || /^-?\d+(\.\d+)?%?$/.test(v)) nums++;
        else strs++;
      }
      return nums > 0 && nums >= strs ? "number" : "string";
    },
    [rawData, viewOffset],
  );

  const colTypes = useMemo(
    () => Array.from({ length: colCount }, (_, i) => columnSettings[i]?.type ?? inferType(i)),
    [colCount, columnSettings, inferType],
  );

  const columns = useMemo<GridColumn[]>(() => {
    const canvas = document.createElement("canvas");
    const cctx = canvas.getContext("2d");
    const measure = (s: string, bold = false) => {
      if (!s) return 0;
      if (!cctx) return s.length * 7.5;
      cctx.font = `${bold ? "600 " : ""}13px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      return cctx.measureText(s).width;
    };
    return Array.from({ length: colCount }, (_, i) => {
      const cs = columnSettings[i];
      const label = cs?.name || cs?.ref || colLetter(i);
      const badge = cs?.ref && cs.ref !== label ? cs.ref : "";
      let maxW = Math.max(measure(label, true), badge ? measure(badge) + 12 : 0);
      for (let r = viewOffset; r < rawData.length; r++) {
        const raw = rawData[r]?.[i]?.value ?? "";
        const disp = raw.startsWith("=") ? (computed[r]?.[i]?.display ?? "") : raw;
        const w = measure(disp);
        if (w > maxW) maxW = w;
      }
      const width = Math.max(64, Math.min(600, Math.ceil(maxW) + 28));
      return {
        title: label,
        id: String(i),
        width,
        icon: badge ? GridColumnIcon.HeaderString : undefined,
      };
    });
  }, [colCount, columnSettings, rawData, computed, viewOffset]);

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const realRow = row + viewOffset;
      const raw = rawData[realRow]?.[col]?.value ?? "";
      const cmp = computed[realRow]?.[col];
      const isFormula = raw.startsWith("=");
      const isErr = !!cmp?.error;
      const colSpec = columnSettings[col];
      const t = colTypes[col];
      const isNum = t === "number" || t === "currency" || t === "percent";

      const display = isFormula
        ? isErr
          ? (cmp?.display ?? "")
          : formatValue(cmp?.display ?? "", colSpec)
        : formatValue(raw, colSpec);

      const themeOverride = isErr
        ? { textDark: ERROR_COLOR, textLight: ERROR_COLOR }
        : isFormula
          ? { textDark: FORMULA_COLOR, textLight: FORMULA_COLOR }
          : undefined;

      return {
        kind: GridCellKind.Text,
        data: raw,
        displayData: display,
        allowOverlay: true,
        readonly: false,
        contentAlign: isNum ? "right" : undefined,
        themeOverride,
      };
    },
    [rawData, computed, columnSettings, colTypes, viewOffset],
  );

  const onCellEdited = useCallback(
    ([col, row]: Item, newValue: EditableGridCell) => {
      const realRow = row + viewOffset;
      let v = "";
      if (newValue.kind === GridCellKind.Number) {
        v = newValue.data == null ? "" : String(newValue.data);
      } else if (newValue.kind === GridCellKind.Text) {
        v = String((newValue as { data?: string }).data ?? "");
      }
      writeCell(realRow, col, v);
    },
    [viewOffset, writeCell],
  );

  const [gridSel, setGridSel] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
    current: undefined,
  });

  useEffect(() => {
    if (picking) return;
    if (!active) return;
    const gridRow = active.row - viewOffset;
    if (gridRow < 0 || gridRow >= rowCount) return;
    setGridSel((prev) => {
      const cur = prev.current?.cell;
      if (cur && cur[0] === active.column && cur[1] === gridRow) return prev;
      return {
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty(),
        current: {
          cell: [active.column, gridRow],
          range: { x: active.column, y: gridRow, width: 1, height: 1 },
          rangeStack: [],
        },
      };
    });
  }, [active, viewOffset, rowCount, picking]);

  const pickingRef = useRef(picking);
  useEffect(() => {
    pickingRef.current = picking;
  }, [picking]);

  const onGridSelectionChange = useCallback(
    (newSel: GridSelection) => {
      setGridSel(newSel);

      if (newSel.rows.length > 0) {
        const arr: number[] = [];
        newSel.rows.toArray().forEach((r) => arr.push(r + viewOffset));
        if (arr.length) onSelect({ kind: "rows", start: Math.min(...arr), end: Math.max(...arr) });
        return;
      }
      if (newSel.columns.length > 0) {
        const arr = newSel.columns.toArray();
        if (arr.length) onSelect({ kind: "cols", start: Math.min(...arr), end: Math.max(...arr) });
        return;
      }

      const cur = newSel.current;
      if (!cur) {
        onSelect(null);
        return;
      }
      const cell = cur.cell;
      const range = cur.range;
      if (range.width > 1 || range.height > 1) {
        const start = { row: range.y + viewOffset, column: range.x };
        const end = {
          row: range.y + range.height - 1 + viewOffset,
          column: range.x + range.width - 1,
        };
        onSelect({ kind: "range", start, end });
        if (!pickingRef.current) onActivateCell({ row: cell[1] + viewOffset, column: cell[0] });
        return;
      }
      const p = { row: cell[1] + viewOffset, column: cell[0] };
      onSelect({ kind: "cell", row: p.row, column: p.column });
      onActivateCell(p);
    },
    [onSelect, onActivateCell, viewOffset],
  );

  const highlightRegions = useMemo(() => {
    if (!active) return undefined;
    const raw = rawData[active.row]?.[active.column]?.value ?? "";
    if (!raw.startsWith("=")) return undefined;
    const regs = parseFormulaRegions(raw, columnSettings);
    if (!regs.length) return undefined;
    const palette = [
      "hsla(217, 91%, 60%, 0.20)",
      "hsla(142, 71%, 45%, 0.20)",
      "hsla(38, 92%, 50%, 0.20)",
      "hsla(280, 70%, 60%, 0.20)",
    ];
    return regs.map((r, i) => {
      const gridRow = r.row - viewOffset;
      const height = Math.min(r.rows ?? 1, Math.max(1, rowCount - gridRow));
      return {
        color: palette[i % palette.length],
        range: {
          x: r.col,
          y: Math.max(0, gridRow),
          width: r.cols ?? 1,
          height: Math.max(1, height),
        },
        style: "solid" as const,
      };
    });
  }, [active, rawData, columnSettings, viewOffset, rowCount]);

  const provideEditor = useCallback<ProvideEditorCallback<GridCell>>((cell) => {
    if (cell.kind !== GridCellKind.Text) return undefined;
    return {
      disablePadding: true,
      disableStyling: true,
      editor: FormulaCellEditor,
    } as ReturnType<ProvideEditorCallback<GridCell>>;
  }, []);

  const drawHeader = useCallback(
    (args: Parameters<NonNullable<React.ComponentProps<typeof DataEditor>["drawHeader"]>>[0]) => {
      const { ctx, theme, rect, columnIndex } = args;
      const cs = columnSettings[columnIndex];
      const label = cs?.name || cs?.ref || colLetter(columnIndex);
      const badge = cs?.ref && cs.ref !== label ? cs.ref : "";
      ctx.save();
      ctx.fillStyle = theme.textHeader;
      ctx.font = `600 13px ${theme.fontFamily}`;
      ctx.textBaseline = "middle";
      const padX = 8;
      ctx.fillText(label, rect.x + padX, rect.y + rect.height / 2);
      if (badge) {
        const labelW = ctx.measureText(label).width;
        const bx = rect.x + padX + labelW + 6;
        ctx.font = `500 10px ${theme.fontFamily}`;
        const bw = ctx.measureText(badge).width + 8;
        const bh = 14;
        const by = rect.y + (rect.height - bh) / 2;
        ctx.fillStyle = "hsla(142, 71%, 45%, 0.15)";
        roundRect(ctx, bx, by, bw, bh, 3);
        ctx.fill();
        ctx.fillStyle = "hsl(142, 71%, 35%)";
        ctx.fillText(badge, bx + 4, rect.y + rect.height / 2);
      }
      ctx.restore();
      return true;
    },
    [columnSettings],
  );

  return (
    <SpreadsheetGridProvider value={{ defs, columnSettings }}>
      <div className={cn("spreadsheet-grid", picking && "spreadsheet-grid--picking")}>
        <DataEditor
          ref={gridRef}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          columns={columns}
          rows={rowCount}
          rowMarkers={{ kind: "number", startIndex: 1 + viewOffset }}
          smoothScrollX
          smoothScrollY
          width="100%"
          height="100%"
          gridSelection={gridSel}
          onGridSelectionChange={onGridSelectionChange}
          highlightRegions={highlightRegions}
          provideEditor={provideEditor}
          drawHeader={drawHeader}
          getCellsForSelection
          keybindings={{ search: false }}
          theme={{
            baseFontStyle: "13px",
            headerFontStyle: "600 13px",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
            accentColor: "hsl(217, 91%, 60%)",
            accentLight: "hsla(217, 91%, 60%, 0.15)",
          }}
        />
      </div>
    </SpreadsheetGridProvider>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// In-cell editor with formula tokens + autocomplete. Glide injects this with
// { value, onChange, onFinishedEditing, target }; defs/columnSettings come from
// the React context provided by the grid.
function FormulaCellEditor(props: {
  value: GridCell;
  onChange: (n: GridCell) => void;
  onFinishedEditing: (newValue?: GridCell, movement?: readonly [number, number]) => void;
  target: Rectangle;
}) {
  const { value, onChange, onFinishedEditing } = props;
  const { defs, columnSettings } = useSpreadsheetGridContext();
  const initial = (value.kind === GridCellKind.Text ? (value as { data?: string }).data : "") ?? "";
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState<string>(initial);
  const [caret, setCaret] = useState(initial.length);
  const [idx, setIdx] = useState(0);
  const [popupPos, setPopupPos] = useState<{ left: number; top: number; width: number } | null>(
    null,
  );
  const ignoreMousePick = useRef(false);
  const skipCommit = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const suggestions = useMemo(
    () => computeSuggestions(raw, caret, defs, columnSettings),
    [raw, caret, defs, columnSettings],
  );
  useEffect(() => setIdx(0), [suggestions.length]);

  useLayoutEffect(() => {
    if (suggestions.length === 0 || idx < 0) {
      setPopupPos(null);
      return;
    }
    const update = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPopupPos({ left: rect.left, top: rect.bottom + 4, width: Math.max(rect.width, 320) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [idx, suggestions.length, raw, caret]);

  const consts = useMemo(() => new Set(Object.keys(defs)), [defs]);
  const refs = useMemo(
    () => new Set(columnSettings.filter((c) => c.ref).map((c) => c.ref!)),
    [columnSettings],
  );

  const commit = (text: string) => {
    onChange({
      ...(value as { kind: GridCellKind.Text }),
      data: text,
      displayData: text,
    } as GridCell);
  };

  const applySuggestion = (i: number) => {
    const s = suggestions[i];
    if (!s) return;
    const before = raw.slice(0, caret - s.tokenLen);
    const after = raw.slice(caret);
    const next = before + s.insert + after;
    const newCaret = before.length + s.insert.length;
    setRaw(next);
    commit(next);
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.setSelectionRange(newCaret, newCaret);
      setCaret(newCaret);
    });
  };

  const pickFromEvent = (e: React.SyntheticEvent<HTMLElement>) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-suggestion-index]");
    const pick = button?.dataset.suggestionIndex;
    if (pick != null) applySuggestion(Number(pick));
  };

  const isFormula = raw.startsWith("=");

  return (
    <div
      ref={wrapRef}
      className="spreadsheet-cell-editor"
      style={{
        minWidth: Math.max(props.target.width, 280),
        minHeight: Math.max(props.target.height, 28),
      }}
    >
      <FormulaTokens
        value={raw}
        consts={consts}
        refs={refs}
        className="spreadsheet-cell-editor__tokens"
      />

      <input
        ref={inputRef}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setCaret(e.target.selectionStart ?? 0);
          commit(e.target.value);
        }}
        onClick={(e) => setCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
        onKeyUp={(e) => setCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (suggestions.length > 0 && idx >= 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => (i + 1) % suggestions.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (e.key === "Tab" || e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              applySuggestion(idx);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setIdx(-1);
              return;
            }
          }
          const finish = (movement: readonly [number, number]) => {
            const next = {
              ...(value as { kind: GridCellKind.Text }),
              data: raw,
              displayData: raw,
            } as GridCell;
            onFinishedEditing(next, movement);
          };
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            finish([0, 1]);
            return;
          }
          if (e.key === "Tab") {
            e.preventDefault();
            e.stopPropagation();
            finish([e.shiftKey ? -1 : 1, 0]);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            skipCommit.current = true;
            onFinishedEditing();
          }
        }}
        className={cn(
          "spreadsheet-cell-editor__input",
          isFormula && "spreadsheet-cell-editor__input--formula",
        )}
        spellCheck={false}
      />
      {suggestions.length > 0 &&
        idx >= 0 &&
        popupPos &&
        createPortal(
          <div
            className="spreadsheet-cell-editor__popup"
            style={{ left: popupPos.left, top: popupPos.top, width: popupPos.width }}
            onPointerDownCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              pickFromEvent(e);
              ignoreMousePick.current = true;
              window.setTimeout(() => {
                ignoreMousePick.current = false;
              }, 0);
            }}
            onMouseDownCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!ignoreMousePick.current) pickFromEvent(e);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <SuggestionList
              suggestions={suggestions}
              activeIdx={idx}
              onPick={applySuggestion}
              onHover={setIdx}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

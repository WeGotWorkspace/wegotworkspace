import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Editor, useEditorState } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { CellSelection } from "@tiptap/pm/tables";
import { GripHorizontal, GripVertical, Heading, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Rect = { top: number; left: number; width: number; height: number };
type Strip = { start: number; size: number };

function findTableDOM(editor: Editor): HTMLTableElement | null {
  const { state, view } = editor;
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "table") {
      const pos = $from.before(d);
      const dom = view.nodeDOM(pos) as HTMLElement | null;
      if (!dom) return null;
      return dom.tagName === "TABLE"
        ? (dom as HTMLTableElement)
        : (dom.querySelector("table") as HTMLTableElement | null);
    }
  }
  return null;
}

function getRows(tableEl: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(
    tableEl.querySelectorAll(":scope > tbody > tr, :scope > thead > tr, :scope > tr"),
  );
}

function selectCellRange(
  editor: Editor,
  anchorCellDOM: Element,
  headCellDOM: Element,
  mode: "row" | "col",
) {
  const { view, state } = editor;
  window.getSelection()?.removeAllRanges();
  view.focus();
  const anchorPos = view.posAtDOM(anchorCellDOM, 0);
  const headPos = view.posAtDOM(headCellDOM, 0);
  if (anchorPos == null || headPos == null) return;
  const $a = state.doc.resolve(anchorPos);
  const $h = state.doc.resolve(headPos);
  const cellTypes = ["tableCell", "tableHeader"];
  const cellDepthA = (() => {
    for (let d = $a.depth; d > 0; d--) if (cellTypes.includes($a.node(d).type.name)) return d;
    return -1;
  })();
  const cellDepthH = (() => {
    for (let d = $h.depth; d > 0; d--) if (cellTypes.includes($h.node(d).type.name)) return d;
    return -1;
  })();
  if (cellDepthA < 0 || cellDepthH < 0) return;
  const aCellPos = $a.before(cellDepthA);
  const hCellPos = $h.before(cellDepthH);
  const sel =
    mode === "row"
      ? CellSelection.rowSelection(state.doc.resolve(aCellPos), state.doc.resolve(hCellPos))
      : CellSelection.colSelection(state.doc.resolve(aCellPos), state.doc.resolve(hCellPos));
  view.dispatch(view.state.tr.setSelection(sel));
}

function selectRowAt(editor: Editor, tableEl: HTMLTableElement, rowIndex: number) {
  const row = getRows(tableEl)[rowIndex];
  if (!row) return;
  const cells = Array.from(row.children);
  if (!cells.length) return;
  selectCellRange(editor, cells[0], cells[cells.length - 1], "row");
}

function selectColAt(editor: Editor, tableEl: HTMLTableElement, colIndex: number) {
  const rows = getRows(tableEl);
  if (!rows.length) return;
  const first = rows[0].children[colIndex];
  const last = rows[rows.length - 1].children[colIndex];
  if (!first || !last) return;
  selectCellRange(editor, first, last, "col");
}

function focusCell(editor: Editor, cellDOM: Element) {
  const pos = editor.view.posAtDOM(cellDOM, 0);
  if (pos == null) return;
  editor.chain().focus().setTextSelection(pos).run();
}

function findTableNode(editor: Editor, tableEl: HTMLTableElement) {
  const inside = editor.view.posAtDOM(tableEl, 0);
  if (inside == null) return null;
  const $p = editor.state.doc.resolve(inside);
  for (let d = $p.depth; d >= 0; d--) {
    if ($p.node(d).type.name === "table") {
      return { node: $p.node(d), pos: $p.before(d) };
    }
  }
  return null;
}

function moveRow(editor: Editor, tableEl: HTMLTableElement, from: number, toGap: number) {
  const info = findTableNode(editor, tableEl);
  if (!info) return;
  const { node: table, pos } = info;
  const rowsArr: ProseMirrorNode[] = [];
  table.forEach((r) => rowsArr.push(r));
  if (from < 0 || from >= rowsArr.length) return;
  const adjusted = toGap > from ? toGap - 1 : toGap;
  if (adjusted === from) return;
  const [moved] = rowsArr.splice(from, 1);
  rowsArr.splice(adjusted, 0, moved);
  const newTable = table.type.create(table.attrs, rowsArr, table.marks);
  editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + table.nodeSize, newTable));
}

function moveCol(editor: Editor, tableEl: HTMLTableElement, from: number, toGap: number) {
  const info = findTableNode(editor, tableEl);
  if (!info) return;
  const { node: table, pos } = info;
  const adjusted = toGap > from ? toGap - 1 : toGap;
  if (adjusted === from) return;
  const newRows: ProseMirrorNode[] = [];
  table.forEach((row) => {
    const cells: ProseMirrorNode[] = [];
    row.forEach((c) => cells.push(c));
    if (from < 0 || from >= cells.length) return;
    const [moved] = cells.splice(from, 1);
    cells.splice(adjusted, 0, moved);
    newRows.push(row.type.create(row.attrs, cells, row.marks));
  });
  const newTable = table.type.create(table.attrs, newRows, table.marks);
  editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + table.nodeSize, newTable));
}

export type TextEditorTableControlsProps = {
  editor: Editor | null;
};

export function TextEditorTableControls({ editor }: TextEditorTableControlsProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? { inTable: ed.isActive("table"), tick: ed.state.selection.from }
        : { inTable: false, tick: 0 },
  }) ?? { inTable: false, tick: 0 };

  const [rect, setRect] = useState<Rect | null>(null);
  const [rows, setRows] = useState<Strip[]>([]);
  const [cols, setCols] = useState<Strip[]>([]);
  const [tableEl, setTableEl] = useState<HTMLTableElement | null>(null);
  const [insertRow, setInsertRow] = useState(-1);
  const [insertCol, setInsertCol] = useState(-1);
  const [handleRow, setHandleRow] = useState(-1);
  const [handleCol, setHandleCol] = useState(-1);
  const [drag, setDrag] = useState<{ type: "row" | "col"; from: number; gap: number } | null>(null);
  const [selRow, setSelRow] = useState(-1);
  const [selCol, setSelCol] = useState(-1);

  useEffect(() => {
    if (!editor) return;
    if (!(editor.state.selection instanceof CellSelection)) {
      setSelRow(-1);
      setSelCol(-1);
    }
  }, [editor, state.tick]);

  useEffect(() => {
    if (!editor || !state.inTable) {
      setRect(null);
      setTableEl(null);
      return;
    }
    const update = () => {
      const dom = findTableDOM(editor);
      if (!dom) {
        setRect(null);
        setTableEl(null);
        return;
      }
      const r = dom.getBoundingClientRect();
      setRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      });
      setTableEl(dom);
      const trs = getRows(dom);
      setRows(
        trs.map((tr) => {
          const rr = tr.getBoundingClientRect();
          return { start: rr.top - r.top, size: rr.height };
        }),
      );
      const firstRow = trs[0];
      if (firstRow) {
        setCols(
          Array.from(firstRow.children).map((c) => {
            const cr = (c as HTMLElement).getBoundingClientRect();
            return { start: cr.left - r.left, size: cr.width };
          }),
        );
      } else {
        setCols([]);
      }
    };
    update();
    const scroller = editor.view.dom.closest(".text-editor-sheet");
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    scroller?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      scroller?.removeEventListener("scroll", update);
    };
  }, [editor, state.inTable, state.tick]);

  useEffect(() => {
    if (!tableEl) return;
    const onMove = (e: MouseEvent) => {
      if (drag) return;
      const r = tableEl.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      const inX = x >= r.left - 32 && x <= r.right + 32;
      const inY = y >= r.top - 32 && y <= r.bottom + 32;
      if (!inX || !inY) {
        setInsertRow(-1);
        setInsertCol(-1);
        setHandleRow(-1);
        setHandleCol(-1);
        return;
      }
      let ir = -1;
      for (let i = 0; i < rows.length; i++) {
        const edge = r.top + rows[i].start + rows[i].size;
        if (Math.abs(y - edge) <= 8) {
          ir = i;
          break;
        }
      }
      let ic = -1;
      for (let j = 0; j < cols.length; j++) {
        const edge = r.left + cols[j].start + cols[j].size;
        if (Math.abs(x - edge) <= 8) {
          ic = j;
          break;
        }
      }
      setInsertRow(ir);
      setInsertCol(ic);

      let hr = -1;
      if (x >= r.left - 32 && x <= r.left + 6 && y >= r.top && y <= r.bottom) {
        for (let i = 0; i < rows.length; i++) {
          if (y >= r.top + rows[i].start && y < r.top + rows[i].start + rows[i].size) {
            hr = i;
            break;
          }
        }
      }
      let hc = -1;
      if (y >= r.top - 32 && y <= r.top + 6 && x >= r.left && x <= r.right) {
        for (let j = 0; j < cols.length; j++) {
          if (x >= r.left + cols[j].start && x < r.left + cols[j].start + cols[j].size) {
            hc = j;
            break;
          }
        }
      }
      setHandleRow(hr);
      setHandleCol(hc);
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [tableEl, rows, cols, drag]);

  useEffect(() => {
    if (!drag || !tableEl) return;
    const onMove = (e: MouseEvent) => {
      const r = tableEl.getBoundingClientRect();
      if (drag.type === "row") {
        let gap = 0;
        const y = e.clientY;
        if (rows.length === 0) return;
        if (y <= r.top + rows[0].start) gap = 0;
        else if (y >= r.top + rows[rows.length - 1].start + rows[rows.length - 1].size)
          gap = rows.length;
        else {
          for (let i = 0; i < rows.length; i++) {
            const top = r.top + rows[i].start;
            const mid = top + rows[i].size / 2;
            if (y < mid) {
              gap = i;
              break;
            }
            gap = i + 1;
          }
        }
        setDrag({ ...drag, gap });
      } else {
        let gap = 0;
        const x = e.clientX;
        if (cols.length === 0) return;
        if (x <= r.left + cols[0].start) gap = 0;
        else if (x >= r.left + cols[cols.length - 1].start + cols[cols.length - 1].size)
          gap = cols.length;
        else {
          for (let j = 0; j < cols.length; j++) {
            const left = r.left + cols[j].start;
            const mid = left + cols[j].size / 2;
            if (x < mid) {
              gap = j;
              break;
            }
            gap = j + 1;
          }
        }
        setDrag({ ...drag, gap });
      }
    };
    const onUp = () => {
      if (drag && editor) {
        if (drag.type === "row") moveRow(editor, tableEl, drag.from, drag.gap);
        else moveCol(editor, tableEl, drag.from, drag.gap);
      }
      setDrag(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [drag, tableEl, rows, cols, editor]);

  if (!editor || !state.inTable || !rect || !tableEl) return null;

  const chain = () => editor.chain().focus();

  const insertRowAfter = (i: number) => {
    const row = getRows(tableEl)[i];
    const cell = row?.children[0];
    if (!cell) return;
    focusCell(editor, cell);
    chain().addRowAfter().run();
  };

  const insertColAfter = (j: number) => {
    const cell = getRows(tableEl)[0]?.children[j];
    if (!cell) return;
    focusCell(editor, cell);
    chain().addColumnAfter().run();
  };

  const btn =
    "text-editor-table-controls__btn pointer-events-auto inline-flex items-center justify-center";

  return createPortal(
    <div
      className="text-editor-table-controls no-print pointer-events-none absolute z-40"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    >
      {!drag && rows.length > 0 ? (
        <button
          type="button"
          title="Add row"
          onClick={() => insertRowAfter(rows.length - 1)}
          className={cn(btn, "absolute h-5 w-5")}
          style={{ top: rect.height + 6, left: rect.width / 2 - 10 }}
        >
          <Plus className="h-3 w-3" />
        </button>
      ) : null}
      {!drag && cols.length > 0 ? (
        <button
          type="button"
          title="Add column"
          onClick={() => insertColAfter(cols.length - 1)}
          className={cn(btn, "absolute h-5 w-5")}
          style={{ left: rect.width + 6, top: rect.height / 2 - 10 }}
        >
          <Plus className="h-3 w-3" />
        </button>
      ) : null}
      {!drag && handleRow >= 0 && rows[handleRow] ? (
        <button
          type="button"
          title="Drag to move row · click to select"
          onMouseDown={(e) => {
            e.preventDefault();
            selectRowAt(editor, tableEl, handleRow);
            setSelRow(handleRow);
            setSelCol(-1);
            setDrag({ type: "row", from: handleRow, gap: handleRow });
          }}
          className={cn(btn, "absolute h-6 w-4 cursor-grab active:cursor-grabbing")}
          style={{ top: rows[handleRow].start + rows[handleRow].size / 2 - 12, left: -22 }}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {!drag && handleCol >= 0 && cols[handleCol] ? (
        <button
          type="button"
          title="Drag to move column · click to select"
          onMouseDown={(e) => {
            e.preventDefault();
            selectColAt(editor, tableEl, handleCol);
            setSelRow(-1);
            setSelCol(handleCol);
            setDrag({ type: "col", from: handleCol, gap: handleCol });
          }}
          className={cn(btn, "absolute h-4 w-6 cursor-grab active:cursor-grabbing")}
          style={{ left: cols[handleCol].start + cols[handleCol].size / 2 - 12, top: -22 }}
        >
          <GripHorizontal className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {!drag && selRow >= 0 && rows[selRow] ? (
        <>
          <button
            type="button"
            title="Delete row"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().deleteRow().run();
              setSelRow(-1);
            }}
            className={cn(btn, "absolute h-5 w-5 text-destructive")}
            style={{ top: rows[selRow].start + rows[selRow].size / 2 - 10, left: -46 }}
          >
            <X className="h-3 w-3" />
          </button>
          {selRow === 0
            ? (() => {
                const isHeader = !!getRows(tableEl)[0]?.querySelector(":scope > th");
                return (
                  <button
                    type="button"
                    title={isHeader ? "Remove header row" : "Set as header row"}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().toggleHeaderRow().run();
                    }}
                    className={cn(
                      btn,
                      "absolute h-5 w-5",
                      isHeader && "bg-accent text-accent-foreground",
                    )}
                    style={{ top: rows[selRow].start + rows[selRow].size / 2 - 10, left: -70 }}
                  >
                    <Heading className="h-3 w-3" />
                  </button>
                );
              })()
            : null}
        </>
      ) : null}
      {!drag && selCol >= 0 && cols[selCol] ? (
        <>
          <button
            type="button"
            title="Delete column"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().deleteColumn().run();
              setSelCol(-1);
            }}
            className={cn(btn, "absolute h-5 w-5 text-destructive")}
            style={{ left: cols[selCol].start + cols[selCol].size / 2 - 10, top: -46 }}
          >
            <X className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Toggle header column"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().toggleHeaderColumn().run();
            }}
            className={cn(btn, "absolute h-5 w-5")}
            style={{ left: cols[selCol].start + cols[selCol].size / 2 - 10, top: -70 }}
          >
            <Heading className="h-3 w-3" />
          </button>
        </>
      ) : null}
      {drag?.type === "row" ? (
        <div
          className="pointer-events-none absolute bg-primary"
          style={{
            top:
              (drag.gap === 0
                ? 0
                : drag.gap >= rows.length
                  ? rows[rows.length - 1].start + rows[rows.length - 1].size
                  : rows[drag.gap].start) - 1,
            left: -8,
            width: rect.width + 16,
            height: 3,
            borderRadius: 2,
          }}
        />
      ) : null}
      {drag?.type === "col" ? (
        <div
          className="pointer-events-none absolute bg-primary"
          style={{
            left:
              (drag.gap === 0
                ? 0
                : drag.gap >= cols.length
                  ? cols[cols.length - 1].start + cols[cols.length - 1].size
                  : cols[drag.gap].start) - 1,
            top: -8,
            height: rect.height + 16,
            width: 3,
            borderRadius: 2,
          }}
        />
      ) : null}
    </div>,
    document.body,
  );
}

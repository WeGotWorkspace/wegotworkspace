import { cn } from "@/lib/utils";
import { FORMULA_FUNCTIONS } from "@/spreadsheet-core/src/ycsv/ycsv-formula-engine";
import type { ColumnSetting, Defs } from "@/spreadsheet-core/src/ycsv/ycsv";

/** "Open" formula context: the cursor is awaiting a reference. */
export const OPEN_TOKEN_RE = /[=+\-*/^&,(:<>!%]\s*$/;

export type Suggestion = {
  kind: "fn" | "def" | "ref";
  label: string;
  detail: string;
  insert: string;
  tokenLen: number;
};

function defDetail(value: Defs[string]): string {
  if (Array.isArray(value)) return `list (${value.length})`;
  if (value && typeof value === "object") return `mapping (${Object.keys(value).length})`;
  return `= ${value}`;
}

export function computeSuggestions(
  draft: string,
  caret: number,
  defs: Defs,
  columnSettings: ColumnSetting[],
): Suggestion[] {
  if (!draft.startsWith("=")) return [];
  const upTo = draft.slice(0, caret);

  const justOpened = /^(=|[+\-*/^&,(:<>!%]\s*)$/.test(upTo.trimEnd());
  if (justOpened) {
    const fns: Suggestion[] = FORMULA_FUNCTIONS.slice(0, 6).map((f) => ({
      kind: "fn",
      label: f.name,
      detail: f.signature,
      insert: f.name + "(",
      tokenLen: 0,
    }));
    const defSuggestions: Suggestion[] = Object.keys(defs).map((n) => ({
      kind: "def",
      label: n,
      detail: defDetail(defs[n]),
      insert: n,
      tokenLen: 0,
    }));
    const refs: Suggestion[] = columnSettings
      .filter((c) => c.ref && /^[a-z][a-z0-9_]*$/.test(c.ref))
      .slice(0, 6)
      .map((c) => ({
        kind: "ref",
        label: c.ref!,
        detail: `column ${c.name ?? c.ref}`,
        insert: c.ref!,
        tokenLen: 0,
      }));
    return [...defSuggestions, ...fns, ...refs];
  }

  const m = upTo.match(/([A-Za-z_][A-Za-z0-9_.]*)$/);
  if (!m) return [];
  const token = m[1];
  if (token.length < 1) return [];
  const tu = token.toUpperCase();
  const tl = token.toLowerCase();
  const fns: Suggestion[] = FORMULA_FUNCTIONS.filter((f) => f.name.startsWith(tu))
    .slice(0, 6)
    .map((f) => ({
      kind: "fn",
      label: f.name,
      detail: f.signature,
      insert: f.name + "(",
      tokenLen: token.length,
    }));
  const defMatches: Suggestion[] = Object.keys(defs)
    .filter((n) => n.toUpperCase().startsWith(tu))
    .slice(0, 6)
    .map((n) => ({
      kind: "def",
      label: n,
      detail: defDetail(defs[n]),
      insert: n,
      tokenLen: token.length,
    }));
  const refMatches: Suggestion[] = columnSettings
    .filter((c) => c.ref && c.ref.toLowerCase().startsWith(tl))
    .slice(0, 4)
    .map((c) => ({
      kind: "ref",
      label: c.ref!,
      detail: `column ${c.name ?? c.ref}`,
      insert: c.ref!,
      tokenLen: token.length,
    }));
  return [...defMatches, ...fns, ...refMatches];
}

export function SuggestionList({
  suggestions,
  activeIdx,
  onPick,
  onHover,
  className,
}: {
  suggestions: Suggestion[];
  activeIdx: number;
  onPick: (i: number) => void;
  onHover: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("spreadsheet-suggest", className)}>
      {suggestions.map((s, i) => (
        <button
          key={`${s.kind}-${s.label}`}
          type="button"
          data-suggestion-index={i}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(i);
          }}
          onMouseEnter={() => onHover(i)}
          className={cn(
            "spreadsheet-suggest__item",
            i === activeIdx && "spreadsheet-suggest__item--active",
          )}
        >
          <span className="spreadsheet-suggest__label">
            <span
              className={cn("spreadsheet-suggest__kind", `spreadsheet-suggest__kind--${s.kind}`)}
            >
              {s.kind === "ref" ? "col" : s.kind}
            </span>
            <span className="spreadsheet-suggest__name">{s.label}</span>
          </span>
          <span className="spreadsheet-suggest__detail">{s.detail}</span>
        </button>
      ))}
    </div>
  );
}

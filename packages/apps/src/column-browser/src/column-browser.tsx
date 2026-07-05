import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/column-browser/src/column-browser.css";

export type ColumnBrowserItem = {
  id: string;
  title: string;
  kind: "folder" | "file";
  icon?: React.ReactNode;
};

export type ColumnBrowserColumn = {
  id: string;
  title: string;
  items: ColumnBrowserItem[];
  loading?: boolean;
  emptyLabel?: string;
};

export type ColumnBrowserProps = {
  columns: ColumnBrowserColumn[];
  selectedItemId?: string | null;
  onSelectItem: (columnIndex: number, item: ColumnBrowserItem) => void;
  className?: string;
};

export function ColumnBrowser({
  columns,
  selectedItemId,
  onSelectItem,
  className,
}: ColumnBrowserProps) {
  return (
    <div className={cn("column-browser", className)} role="tree" aria-label="Folder columns">
      {columns.map((column, columnIndex) => (
        <section
          key={column.id}
          className="column-browser__column"
          role="group"
          aria-label={column.title}
        >
          <header className="column-browser__header">{column.title}</header>
          <div className="column-browser__list">
            {column.loading ? (
              <p className="column-browser__empty">Loading…</p>
            ) : column.items.length === 0 ? (
              <p className="column-browser__empty">{column.emptyLabel ?? "Empty"}</p>
            ) : (
              column.items.map((item) => {
                const selected = selectedItemId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="treeitem"
                    aria-selected={selected}
                    className={cn(
                      "column-browser__item",
                      selected && "column-browser__item--selected",
                    )}
                    onClick={() => onSelectItem(columnIndex, item)}
                  >
                    <span className="shrink-0 [&>svg]:size-4" aria-hidden>
                      {item.icon ??
                        (item.kind === "folder" ? (
                          <Folder className="size-4" fill="currentColor" fillOpacity={0.18} />
                        ) : null)}
                    </span>
                    <span className="column-browser__item-title">{item.title}</span>
                    {item.kind === "folder" ? (
                      <ChevronRight className="column-browser__item-chevron" aria-hidden />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { WorkspaceSidebarToggle } from "@/workspace-shell/src/workspace-app-layout";
import { CollectionSearchInput } from "@/collection-search-input/src/collection-search-input";
import { cn } from "@/lib/utils";

import "./list-header.css";

type ListHeaderProps = {
  title: string;
  subtitle?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchInput?: (query: string) => void;
  searchDebounceMs?: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function ListHeader({
  title,
  subtitle,
  sidebarOpen,
  onToggleSidebar,
  actions,
  searchPlaceholder,
  searchValue = "",
  onSearchInput,
  searchDebounceMs = 180,
  searchInputRef,
}: ListHeaderProps) {
  const [query, setQuery] = useState(searchValue);

  useEffect(() => {
    setQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (!onSearchInput) return;
    const timeout = window.setTimeout(() => onSearchInput(query), searchDebounceMs);
    return () => window.clearTimeout(timeout);
  }, [query, onSearchInput, searchDebounceMs]);

  return (
    <>
      <div className="flex items-start gap-3">
        <WorkspaceSidebarToggle open={sidebarOpen} onToggle={onToggleSidebar} />
        <div className="list-header__main">
          <div className="flex items-center gap-3 min-w-0">
            <h2
              className="text-3xl leading-none flex-1 min-w-0 truncate"
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
            >
              {title}
            </h2>
            {actions ? <div className="flex items-center gap-1.5 shrink-0">{actions}</div> : null}
          </div>
          {subtitle ? (
            <p className={cn("field-label-row__label", "list-header__subtitle", "mt-2")}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {searchPlaceholder ? (
        <CollectionSearchInput
          inputRef={searchInputRef}
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
        />
      ) : null}
    </>
  );
}

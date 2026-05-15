import type { ReactNode, RefObject } from "react";
import { useEffect, useState } from "react";
import { WorkspaceSidebarToggle } from "@/workspace-shell/src/workspace-app-layout";
import { CollectionSearchInput } from "@/collection-search-input/src/collection-search-input";
import { cn } from "@/lib/utils";

import "./view-header.css";

type ViewHeaderProps = {
  title: string;
  subtitle?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  actions?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchInput?: (query: string) => void;
  searchDebounceMs?: number;
  searchInputRef?: RefObject<HTMLInputElement | null>;
};

export function ViewHeader({
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
}: ViewHeaderProps) {
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
        <div className="view-header__main">
          <div className="view-header__title-row">
            <h2
              className="text-3xl leading-none min-w-0 truncate"
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
            >
              {title}
            </h2>
            <div className="view-header__actions">{actions}</div>
          </div>
          {subtitle ? (
            <p className={cn("field-label-row__label", "view-header__subtitle", "mt-2")}>
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

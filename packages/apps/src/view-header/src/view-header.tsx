import type { ReactNode, RefObject } from "react";
import { useEffect, useState } from "react";
import { WorkspaceSidebarToggle } from "@/workspace-shell/src/workspace-app-layout";
import { CollectionSearchInput } from "@/collection-search-input/src/collection-search-input";
import { cn } from "@/lib/utils";

import "./view-header.css";

type ViewHeaderProps = {
  title: string;
  subtitle?: string;
  /** When true, omits the workspace sidebar toggle (e.g. portaled compose dialog). */
  hideSidebarToggle?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  actions?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchInput?: (query: string) => void;
  searchDebounceMs?: number;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  searchContent?: ReactNode;
};

export function ViewHeader({
  title,
  subtitle,
  hideSidebarToggle = false,
  sidebarOpen = false,
  onToggleSidebar,
  actions,
  searchPlaceholder,
  searchValue = "",
  onSearchInput,
  searchDebounceMs = 180,
  searchInputRef,
  searchContent,
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
        {hideSidebarToggle ? null : (
          <WorkspaceSidebarToggle open={sidebarOpen} onToggle={onToggleSidebar ?? (() => {})} />
        )}
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
        <div className="view-header__search-stack">
          <CollectionSearchInput
            inputRef={searchInputRef}
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
          />
          {searchContent}
        </div>
      ) : null}
    </>
  );
}

import type { ReactNode } from "react";
import {
  CalendarDays,
  ContactRound,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Image as ImageIcon,
  LoaderCircle,
} from "lucide-react";
import type { WgwUnifiedSearchResult } from "@/lib/api/wgw/search";
import { MenuItem } from "@/menu-item/src/menu-item";
import { Tag } from "@/tag/src/tag";
import { cn } from "@/lib/utils";
import "@/unified-search-dropdown/src/unified-search-results-dropdown.css";

type ResultGroup = {
  key: string;
  label: string;
  icon: ReactNode;
  items: WgwUnifiedSearchResult[];
};

export type UnifiedSearchResultsDropdownProps = {
  query: string;
  results: WgwUnifiedSearchResult[];
  loading?: boolean;
  error?: string | null;
  maxResults?: number;
  className?: string;
  onSelect?: (result: WgwUnifiedSearchResult) => void;
  emptyLabel?: string;
  promptLabel?: string;
};

export function UnifiedSearchResultsDropdown({
  query,
  results,
  loading = false,
  error = null,
  maxResults = 10,
  className,
  onSelect,
  emptyLabel = "No results",
  promptLabel = "Start typing to search",
}: UnifiedSearchResultsDropdownProps) {
  const trimmedQuery = query.trim();
  const limited = results.slice(0, maxResults);
  const groups = groupResults(limited);

  return (
    <div
      className={cn("unified-search-results-dropdown", className)}
      role="listbox"
      aria-label="Search results"
    >
      {loading ? (
        <div className="unified-search-results-dropdown__state" role="status" aria-live="polite">
          <LoaderCircle className="size-4 animate-spin" />
          <span>Searching…</span>
        </div>
      ) : error ? (
        <div className="unified-search-results-dropdown__state">{error}</div>
      ) : trimmedQuery.length < 2 ? (
        <div className="unified-search-results-dropdown__state">{promptLabel}</div>
      ) : limited.length === 0 ? (
        <div className="unified-search-results-dropdown__state">{emptyLabel}</div>
      ) : (
        <div className="unified-search-results-dropdown__groups">
          {groups.map((group) => (
            <section
              key={group.key}
              className="unified-search-results-dropdown__group"
              aria-label={group.label}
            >
              <header className="unified-search-results-dropdown__group-title">
                <span className="unified-search-results-dropdown__group-title-main">
                  {group.icon}
                  <span>{group.label}</span>
                </span>
                <span className="unified-search-results-dropdown__group-count">
                  {group.items.length}
                </span>
              </header>
              <ul className="unified-search-results-dropdown__items">
                {group.items.map((result) => (
                  <li key={`${result.sourceType}:${result.sourceKey}`}>
                    <div className="unified-search-results-dropdown__item">
                      <MenuItem
                        label={result.title || result.sourceKey}
                        description={
                          <span className="unified-search-results-dropdown__item-description">
                            {result.snippet?.trim() || result.sourceKey}
                          </span>
                        }
                        icon={
                          <span
                            className={cn(
                              "unified-search-results-dropdown__item-icon",
                              `unified-search-results-dropdown__item-icon--${result.sourceType}`,
                            )}
                          >
                            {iconForResult(result)}
                          </span>
                        }
                        onClick={() => onSelect?.(result)}
                        className={cn(
                          "unified-search-results-dropdown__menu-item",
                          `unified-search-results-dropdown__menu-item--${result.sourceType}`,
                        )}
                      />
                      <div className="unified-search-results-dropdown__item-tags">
                        <Tag
                          label={labelForSourceType(result.sourceType)}
                          colors={{
                            backgroundColor: "var(--unified-search-tag-bg, hsl(0 0% 95%))",
                            color: accentColorForSource(result.sourceType),
                          }}
                        />
                        {result.category ? (
                          <Tag
                            label={result.category}
                            colors={{
                              backgroundColor: "var(--unified-search-tag-bg, hsl(0 0% 95%))",
                              color: "var(--unified-search-tag-fg, hsl(0 0% 34%))",
                            }}
                          />
                        ) : null}
                        {result.extension ? (
                          <Tag
                            label={result.extension}
                            colors={{
                              backgroundColor: "var(--unified-search-tag-bg, hsl(0 0% 95%))",
                              color: "var(--unified-search-tag-fg, hsl(0 0% 34%))",
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupResults(results: WgwUnifiedSearchResult[]): ResultGroup[] {
  const files = results.filter((item) => item.sourceType === "file");
  const calendars = results.filter((item) => item.sourceType === "caldav");
  const contacts = results.filter((item) => item.sourceType === "carddav");

  const groups: ResultGroup[] = [];
  if (files.length)
    groups.push({
      key: "file",
      label: "Files",
      icon: <Folder className="size-3.5" />,
      items: files,
    });
  if (calendars.length) {
    groups.push({
      key: "caldav",
      label: "Calendar",
      icon: <CalendarDays className="size-3.5" />,
      items: calendars,
    });
  }
  if (contacts.length) {
    groups.push({
      key: "carddav",
      label: "Contacts",
      icon: <ContactRound className="size-3.5" />,
      items: contacts,
    });
  }

  return groups;
}

function iconForResult(result: WgwUnifiedSearchResult): ReactNode {
  if (result.sourceType === "caldav") return <CalendarDays className="size-4" />;
  if (result.sourceType === "carddav") return <ContactRound className="size-4" />;
  if (result.category === "folder") return <Folder className="size-4" />;
  if (result.category === "spreadsheet") return <FileSpreadsheet className="size-4" />;
  if (result.category === "image") return <ImageIcon className="size-4" />;
  if (result.category === "document") return <FileText className="size-4" />;
  return <File className="size-4" />;
}

function labelForSourceType(sourceType: string): string {
  if (sourceType === "file") return "Files";
  if (sourceType === "caldav") return "Calendar";
  if (sourceType === "carddav") return "Contacts";
  return sourceType;
}

function accentColorForSource(sourceType: string): string {
  if (sourceType === "file") return "var(--unified-search-accent-files, #2563eb)";
  if (sourceType === "caldav") return "var(--unified-search-accent-calendar, #8b5cf6)";
  if (sourceType === "carddav") return "var(--unified-search-accent-contacts, #16a34a)";
  return "var(--unified-search-accent-default, #475569)";
}

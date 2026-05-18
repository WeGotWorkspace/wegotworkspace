import { useEffect, useState, type RefObject } from "react";
import { CollectionSearchInput } from "@/collection-search-input/src/collection-search-input";
import { cn } from "@/lib/utils";
import "@/search-bar/src/search-bar.css";

export type SearchBarProps = {
  placeholder: string;
  value?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
};

export function SearchBar({
  placeholder,
  value = "",
  onSearch,
  debounceMs = 180,
  inputRef,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const timeout = window.setTimeout(() => onSearch(query), debounceMs);
    return () => window.clearTimeout(timeout);
  }, [query, onSearch, debounceMs]);

  return (
    <div className={cn("search-bar", className)}>
      <CollectionSearchInput
        inputRef={inputRef}
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
      />
    </div>
  );
}

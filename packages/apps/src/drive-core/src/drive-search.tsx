import type { RefObject } from "react";
import { SearchBar } from "@/search-bar/src/search-bar";
import { cn } from "@/lib/utils";

export type DriveSearchProps = {
  placeholder: string;
  value: string;
  onSearch: (query: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
};

export function DriveSearch({
  placeholder,
  value,
  onSearch,
  inputRef,
  className,
}: DriveSearchProps) {
  return (
    <SearchBar
      className={cn("drive-search", className)}
      placeholder={placeholder}
      value={value}
      onSearch={onSearch}
      inputRef={inputRef}
    />
  );
}

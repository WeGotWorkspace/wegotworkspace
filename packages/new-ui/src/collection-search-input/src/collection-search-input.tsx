import { Search, X } from "lucide-react";

type CollectionSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function CollectionSearchInput({
  value,
  onChange,
  placeholder,
  inputRef,
}: CollectionSearchInputProps) {
  return (
    <div
      className="mt-3 flex items-center gap-2 px-3 h-9 rounded-md"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
        color: "var(--color-ink)",
      }}
    >
      <Search className="size-4 opacity-60 shrink-0" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onChange("");
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {value && (
        <button
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="size-6 rounded-full flex items-center justify-center hover:bg-[color-mix(in_oklab,var(--color-ink)_10%,transparent)]"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

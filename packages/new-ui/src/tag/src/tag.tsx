import type { CSSProperties } from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type TagProps = {
  label: string;
  /** When `false`, a remove control is shown and `onDelete` should be provided. */
  readonly?: boolean;
  onDelete?: () => void;
  className?: string;
};

export function Tag({ label, readonly = true, onDelete, className }: TagProps) {
  return (
    <span
      className={cn(
        "text-[13px] px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1 group",
        className,
      )}
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
        color: "var(--color-ink)",
      }}
    >
      #{label}
      {!readonly && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove tag ${label}`}
          className="opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export type TagGroupProps = {
  tags: string[];
  /** When `false`, tags are removable and an add control is shown when `onAdd` is set. */
  readonly?: boolean;
  onAdd?: () => void;
  /** Called with the tag label (without `#`) when a tag is removed. */
  onRemoveTag?: (label: string) => void;
  className?: string;
  style?: CSSProperties;
};

export function TagGroup({
  tags,
  readonly = true,
  onAdd,
  onRemoveTag,
  className,
  style,
}: TagGroupProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} style={style}>
      {tags.map((t) => (
        <Tag
          key={t}
          label={t}
          readonly={readonly}
          onDelete={readonly || !onRemoveTag ? undefined : () => onRemoveTag(t)}
        />
      ))}
      {!readonly && onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="text-[13px] px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1 border border-dashed transition-colors hover:opacity-80"
          style={{
            borderColor: "color-mix(in oklab, var(--color-ink) 25%, transparent)",
            color: "color-mix(in oklab, var(--color-ink) 65%, transparent)",
          }}
        >
          <Plus className="size-3" /> Tag
        </button>
      ) : null}
    </div>
  );
}

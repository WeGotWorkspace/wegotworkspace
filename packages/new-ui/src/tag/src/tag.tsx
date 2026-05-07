import type { CSSProperties } from "react";
import { Plus, Tag as TagIcon, X } from "lucide-react";

import { AppButton } from "@/app-button/src/app-button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

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
      <TagIcon className="size-3.5 opacity-70" />
      <span>{label}</span>
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
  /** Called with the tag label when a tag is removed. */
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
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <AppButton
                size="icon"
                variant="subtle"
                icon={<Plus className="size-3.5" />}
                onClick={onAdd}
                ariaLabel="Add tag"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>Add tag</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { Plus, Tag as TagIcon, X } from "lucide-react";

import { IconButton } from "@/button/src/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

import "./tag.css";

export type TagProps = {
  label: string;
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  removeAriaLabel?: string;
  colors?: {
    backgroundColor?: string;
    color?: string;
  };
};

export function Tag({
  label,
  icon,
  removable = false,
  onRemove,
  removeAriaLabel,
  colors,
}: TagProps) {
  return (
    <span
      className="tag group"
      style={{
        backgroundColor:
          colors?.backgroundColor ?? "color-mix(in oklab, var(--color-ink) 8%, transparent)",
        color: colors?.color ?? "var(--color-ink)",
      }}
    >
      {icon}
      <span className="truncate">{label}</span>
      {removable && onRemove ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onRemove}
              aria-label={removeAriaLabel ?? `Remove ${label}`}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{removeAriaLabel ?? `Remove ${label}`}</TooltipContent>
        </Tooltip>
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
  tagColors?: TagProps["colors"];
  className?: string;
  style?: CSSProperties;
};

export function TagGroup({
  tags,
  readonly = true,
  onAdd,
  onRemoveTag,
  tagColors,
  className,
  style,
}: TagGroupProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} style={style}>
      {tags.map((t) => (
        <Tag
          key={t}
          label={t}
          icon={<TagIcon className="size-3.5 opacity-70" />}
          colors={tagColors}
          removable={!readonly}
          onRemove={readonly || !onRemoveTag ? undefined : () => onRemoveTag(t)}
          removeAriaLabel={`Remove tag ${t}`}
        />
      ))}
      {!readonly && onAdd ? (
        <IconButton label="Add tag" icon={<Plus />} onClick={onAdd} size="md" variant="subtle" />
      ) : null}
    </div>
  );
}

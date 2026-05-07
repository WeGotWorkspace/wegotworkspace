import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type MenuItemTone = "sidebar" | "inherit";

export type MenuItemProps = {
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  checked?: boolean;
  isDropTarget?: boolean;
  to?: string;
  className?: string;
  tone?: MenuItemTone;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
};

export const MenuItem = React.forwardRef<HTMLAnchorElement | HTMLButtonElement, MenuItemProps>(
  function MenuItem(
    {
      label,
      icon,
      badge,
      onClick,
      selected,
      checked,
      isDropTarget,
      to,
      className,
      tone = "sidebar",
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref,
  ) {
    const row = (
      <>
        <span className="flex-1 min-w-0 inline-flex items-center gap-2.5 truncate">
          {icon != null ? (
            <span
              aria-hidden
              className="shrink-0"
              style={tone === "sidebar" ? { opacity: selected ? 0.9 : 0.65 } : { opacity: 0.7 }}
            >
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 truncate">{label}</span>
        </span>
        {badge != null && badge !== false ? (
          <span
            className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-semibold tabular-nums rounded-full"
            style={
              tone === "sidebar"
                ? {
                    backgroundColor: selected
                      ? "var(--color-ink)"
                      : "color-mix(in oklab, var(--color-ink) 14%, transparent)",
                    color: selected
                      ? "var(--sidebar-badge-fg, var(--color-cream, #f5f1e8))"
                      : "color-mix(in oklab, var(--color-ink) 80%, transparent)",
                  }
                : {
                    backgroundColor: "color-mix(in oklab, currentColor 18%, transparent)",
                    color: "inherit",
                  }
            }
          >
            {badge}
          </span>
        ) : null}
        {checked ? <Check className="size-3.5 shrink-0 opacity-70" aria-hidden /> : null}
      </>
    );

    const sharedClass = cn(
      "w-full text-left flex items-center gap-2 px-4 py-2 text-sm rounded transition-[color,background-color,box-shadow] outline-none",
      "hover:bg-[color-mix(in_oklab,currentColor_12%,transparent)]",
      "focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,currentColor_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
      tone === "sidebar" &&
        (isDropTarget
          ? "text-[var(--color-ink)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-ink)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-ink)_22%,transparent)]"
          : selected
            ? "text-[var(--color-ink)] bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
            : "text-[color-mix(in_oklab,var(--color-ink)_75%,transparent)] bg-transparent"),
      tone === "inherit" && "text-inherit bg-transparent",
      className,
    );

    if (to != null) {
      return (
        <Link ref={ref as React.ForwardedRef<HTMLAnchorElement>} to={to} className={sharedClass}>
          {row}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={sharedClass}
      >
        {row}
      </button>
    );
  },
);

MenuItem.displayName = "MenuItem";

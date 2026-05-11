import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type UserAvatarSize = "sm" | "md";

export type UserAvatarProps = {
  displayName: string;
  /** Shown under the display name (e.g. email, handle). Ignored when `compact` is true. */
  subtitle?: ReactNode;
  /** Avatar + label only; no text column. */
  compact?: boolean;
  /** `sm` = sidebar/footer chip; `md` = mail sender row. */
  size?: UserAvatarSize;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
};

function initialsFromDisplayName(displayName: string) {
  return displayName
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function UserAvatar({
  displayName,
  subtitle,
  compact = false,
  size = "sm",
  onClick,
  className,
  style,
}: UserAvatarProps) {
  const initials = initialsFromDisplayName(displayName) || "?";

  const circleClass =
    size === "md"
      ? "size-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
      : "size-9 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0";

  const circle = onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${displayName} avatar`}
      className={circleClass}
      style={{
        backgroundColor: "var(--user-avatar-bg, color-mix(in oklab, var(--color-ink) 12%, transparent))",
        color: "var(--user-avatar-fg, var(--color-ink))",
      }}
    >
      {initials}
    </button>
  ) : (
    <div
      className={circleClass}
      style={{
        backgroundColor: "var(--user-avatar-bg, color-mix(in oklab, var(--color-ink) 12%, transparent))",
        color: "var(--user-avatar-fg, var(--color-ink))",
      }}
      role="img"
      aria-label={`${displayName} avatar`}
    >
      {initials}
    </div>
  );

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)} style={style}>
      {circle}
      {!compact ? (
        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
          <div
            className={cn("truncate", subtitle ? "text-sm font-semibold" : "text-sm")}
            style={{
              color: "var(--user-avatar-label-color, var(--user-avatar-fg, var(--color-ink)))",
            }}
          >
            {displayName}
          </div>
          {subtitle != null && subtitle !== "" ? (
            <div
              className="text-xs truncate"
              style={{
                color: "var(--user-avatar-subtitle-color, color-mix(in oklab, var(--color-ink) 55%, transparent))",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

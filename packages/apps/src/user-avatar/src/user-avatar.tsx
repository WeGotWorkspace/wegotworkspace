import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import "@/user-avatar/src/user-avatar.css";

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
}: UserAvatarProps) {
  const initials = initialsFromDisplayName(displayName) || "?";
  const sizeClass = size === "md" ? "user-avatar--md" : "user-avatar--sm";

  const circle = onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${displayName} avatar`}
      className="user-avatar__mark"
    >
      {initials}
    </button>
  ) : (
    <div className="user-avatar__mark" role="img" aria-label={`${displayName} avatar`}>
      {initials}
    </div>
  );

  return (
    <div className={cn("user-avatar", sizeClass, className)}>
      {circle}
      {!compact ? (
        <div className="user-avatar__text">
          <div
            className={cn(
              "user-avatar__name",
              subtitle != null && subtitle !== "" && "user-avatar__name--emphasized",
            )}
          >
            {displayName}
          </div>
          {subtitle != null && subtitle !== "" ? (
            <div className="user-avatar__subtitle">{subtitle}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

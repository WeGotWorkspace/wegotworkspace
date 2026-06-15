import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import "@/user-avatar/src/user-avatar.css";

export type UserAvatarSize = "sm" | "md" | "lg" | "xl";

export type UserAvatarProps = {
  displayName: string;
  /** Shown under the display name (e.g. email, handle). Ignored when `compact` is true. */
  subtitle?: ReactNode;
  /** When set, show profile photo; falls back to initials on load error or when omitted. */
  imageSrc?: string;
  /** Avatar + label only; no text column. */
  compact?: boolean;
  /** `sm` = sidebar/footer chip; `md` = mail sender row; `lg` / `xl` = meet tiles and lobby preview. */
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
  imageSrc,
  compact = false,
  size = "sm",
  onClick,
  className,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = initialsFromDisplayName(displayName) || "?";
  const showImage = Boolean(imageSrc) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  const sizeClass =
    size === "md"
      ? "user-avatar--md"
      : size === "lg"
        ? "user-avatar--lg"
        : size === "xl"
          ? "user-avatar--xl"
          : "user-avatar--sm";

  const markContent = showImage ? (
    <img
      src={imageSrc}
      alt=""
      className="user-avatar__image"
      onError={() => setImageFailed(true)}
    />
  ) : (
    initials
  );

  const circle = onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${displayName} avatar`}
      className="user-avatar__mark"
    >
      {markContent}
    </button>
  ) : (
    <div className="user-avatar__mark" role="img" aria-label={`${displayName} avatar`}>
      {markContent}
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

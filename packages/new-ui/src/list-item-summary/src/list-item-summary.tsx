import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ListItemSummaryProps = {
  icon?: ReactNode;
  title: ReactNode;
  message?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  contentClassName?: string;
  onClick?: () => void;
  buttonLabel?: string;
};

export function ListItemSummary({
  icon,
  title,
  message,
  subtitle,
  className,
  contentClassName,
  onClick,
  buttonLabel,
}: ListItemSummaryProps) {
  const content = (
    <>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <span className={cn("flex-1 min-w-0", contentClassName)}>
        <span className="block text-sm font-medium">{title}</span>
        {message ? <span className="block text-xs opacity-75 mt-0.5">{message}</span> : null}
        {subtitle ? <span className="block text-xs opacity-65 mt-0.5">{subtitle}</span> : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={buttonLabel}
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-md transition-colors hover:bg-[color-mix(in_oklab,currentColor_6%,transparent)]",
          className,
        )}
      >
        <span className="flex items-start gap-3 py-1.5">{content}</span>
      </button>
    );
  }

  return <div className={cn("flex items-start gap-3", className)}>{content}</div>;
}

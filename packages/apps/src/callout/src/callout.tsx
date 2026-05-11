import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MenuItem } from "@/menu-item/src/menu-item";

export type CalloutSeverity = "info" | "success" | "warning" | "error";

export type CalloutProps = {
  severity?: CalloutSeverity;
  title: ReactNode;
  message?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const toneStyles: Record<CalloutSeverity, { bg: string; border: string; iconColor: string }> = {
  info: {
    bg: "color-mix(in oklab, #1a1a18 5%, transparent)",
    border: "color-mix(in oklab, #1a1a18 15%, transparent)",
    iconColor: "#1a1a18",
  },
  success: {
    bg: "color-mix(in oklab, #3a8f5a 12%, transparent)",
    border: "color-mix(in oklab, #3a8f5a 35%, transparent)",
    iconColor: "#3a8f5a",
  },
  warning: {
    bg: "color-mix(in oklab, #c98a1f 14%, transparent)",
    border: "color-mix(in oklab, #c98a1f 35%, transparent)",
    iconColor: "#c98a1f",
  },
  error: {
    bg: "color-mix(in oklab, #b14242 14%, transparent)",
    border: "color-mix(in oklab, #b14242 35%, transparent)",
    iconColor: "#b14242",
  },
};

function defaultIconForSeverity(severity: CalloutSeverity) {
  switch (severity) {
    case "success":
      return CircleCheck;
    case "warning":
      return CircleAlert;
    case "error":
      return CircleX;
    case "info":
    default:
      return Info;
  }
}

export function Callout({
  severity = "info",
  title,
  message,
  subtitle,
  icon,
  className,
}: CalloutProps) {
  const tone = toneStyles[severity];
  const Icon = defaultIconForSeverity(severity);
  const description =
    message && subtitle ? (
      <>
        {message}
        <span className="opacity-70"> - </span>
        {subtitle}
      </>
    ) : (
      (message ?? subtitle)
    );

  return (
    <div
      className={cn("rounded-lg border p-4", className)}
      style={{
        backgroundColor: tone.bg,
        borderColor: tone.border,
        color: "var(--color-ink)",
      }}
    >
      <MenuItem
        tone="inherit"
        className="px-0 py-0 hover:bg-transparent focus-visible:ring-0"
        icon={icon ?? <Icon className="size-4" style={{ color: tone.iconColor }} aria-hidden />}
        label={title}
        description={description}
      />
    </div>
  );
}

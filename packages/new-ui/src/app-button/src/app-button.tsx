type AppButtonProps = {
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: "icon" | "sm" | "md" | "pill";
  variant?: "primary" | "ghost" | "subtle";
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

export function AppButton({
  label,
  icon,
  onClick,
  disabled = false,
  size = "md",
  variant = "subtle",
  className,
  style,
  ariaLabel,
}: AppButtonProps) {
  const sizeClassName =
    size === "icon"
      ? "size-9 rounded-full"
      : size === "sm"
        ? "h-8 px-3 rounded-md text-xs"
        : size === "pill"
          ? "h-10 w-full rounded-full text-sm font-medium"
          : "h-9 px-3 rounded-md text-sm";

  const baseClassName = `inline-flex items-center justify-center gap-2 transition-colors ${sizeClassName}`;
  const disabledClassName = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";

  const variantClassName =
    variant === "primary"
      ? "hover:opacity-95"
      : variant === "ghost"
        ? "hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
        : "hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]";

  const variantStyle =
    variant === "primary"
      ? {
          backgroundColor: "var(--color-ink)",
          color: "var(--color-emerald)",
          boxShadow: "0 10px 24px -12px color-mix(in oklab, var(--color-ink) 60%, transparent)",
        }
      : variant === "ghost"
        ? {
            color: "var(--color-ink)",
            backgroundColor: "transparent",
          }
        : {
            color: "color-mix(in oklab, var(--color-ink) 65%, transparent)",
            backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          };

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClassName} ${variantClassName} ${disabledClassName}${className ? ` ${className}` : ""}`}
      style={{ ...variantStyle, ...style }}
    >
      {icon}
      {label ? <span>{label}</span> : null}
    </button>
  );
}

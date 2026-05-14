import type { CSSProperties } from "react";

export const APP_BUTTON_BASE_CLASSNAME =
  "inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

export const APP_BUTTON_SIZE_CLASSNAMES = {
  sm: "h-8 px-3 rounded-md text-xs font-medium",
  md: "h-9 px-3 rounded-md text-sm font-medium",
  lg: "h-10 px-8 rounded-md text-sm font-medium",
  pill: "h-10 px-8 rounded-full text-sm font-medium",
} as const;

export const APP_ICON_BUTTON_SIZE_CLASSNAMES = {
  sm: "size-8 rounded-full",
  md: "size-9 rounded-full",
  lg: "size-11 rounded-full [&>svg]:size-5!",
} as const;

export const APP_BUTTON_VARIANT_CLASSNAMES = {
  primary: "hover:opacity-95",
  destructive: "hover:bg-[color-mix(in_oklab,var(--color-red-500,#dc2626)_88%,black)]",
  outline:
    "border border-[color:color-mix(in_oklab,var(--color-ink)_20%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)]",
  ghost: "hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]",
  subtle: "hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]",
} as const;

export const APP_BUTTON_VARIANT_STYLES: Record<
  keyof typeof APP_BUTTON_VARIANT_CLASSNAMES,
  CSSProperties
> = {
  primary: {
    backgroundColor: "var(--color-ink)",
    color: "var(--color-emerald)",
    boxShadow: "0 10px 24px -12px color-mix(in oklab, var(--color-ink) 60%, transparent)",
  },
  destructive: {
    backgroundColor: "var(--color-red-500, #dc2626)",
    color: "white",
  },
  outline: {
    color: "var(--color-ink)",
    backgroundColor: "transparent",
    boxShadow: "0 1px 2px color-mix(in oklab, var(--color-ink) 8%, transparent)",
  },
  ghost: {
    color: "var(--color-ink)",
    backgroundColor: "transparent",
  },
  subtle: {
    color: "color-mix(in oklab, var(--color-ink) 65%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
  },
};

export function getButtonVariantStyle(
  variant: keyof typeof APP_BUTTON_VARIANT_STYLES,
  active?: boolean,
): CSSProperties {
  if (!active) return APP_BUTTON_VARIANT_STYLES[variant];
  return {
    ...APP_BUTTON_VARIANT_STYLES[variant],
    color: "var(--color-emerald)",
  };
}

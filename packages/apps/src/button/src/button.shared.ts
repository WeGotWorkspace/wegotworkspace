type ButtonVariantStyle = {
  backgroundColor?: string;
  color?: string;
  boxShadow?: string;
};

export const BUTTON_SIZE_OPTIONS = ["sm", "md", "lg"] as const;
export const ICON_BUTTON_SIZE_OPTIONS = ["sm", "md", "lg"] as const;
export const BUTTON_VARIANT_OPTIONS = [
  "primary",
  "destructive",
  "outline",
  "ghost",
  "subtle",
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANT_OPTIONS)[number];
export type ButtonSize = (typeof BUTTON_SIZE_OPTIONS)[number];
export type IconButtonSize = (typeof ICON_BUTTON_SIZE_OPTIONS)[number];

export const BUTTON_BASE_CLASSNAME = "button";
export const BUTTON_PILL_CLASSNAME = "button--pill";
export const BUTTON_ICON_SLOT_CLASSNAME = "button__icon";
export const ICON_BUTTON_ACTIVE_CLASSNAME = "icon-button--active";

export const BUTTON_SIZE_CLASSNAMES: Record<ButtonSize, string> = {
  sm: "button--size-sm",
  md: "button--size-md",
  lg: "button--size-lg",
};
export const ICON_BUTTON_SIZE_CLASSNAMES: Record<IconButtonSize, string> = {
  sm: "icon-button--size-sm",
  md: "icon-button--size-md",
  lg: "icon-button--size-lg",
};
export const BUTTON_VARIANT_CLASSNAMES: Record<ButtonVariant, string> = {
  primary: "button--variant-primary",
  destructive: "button--variant-destructive",
  outline: "button--variant-outline",
  ghost: "button--variant-ghost",
  subtle: "button--variant-subtle",
};

const BUTTON_VARIANT_STYLES: Record<ButtonVariant, ButtonVariantStyle> = {
  primary: {
    backgroundColor: "var(--button-primary-bg, var(--color-ink))",
    color: "var(--button-primary-fg, var(--color-emerald))",
    boxShadow:
      "0 10px 24px -12px color-mix(in oklab, var(--button-primary-bg, var(--color-ink)) 60%, transparent)",
  },
  destructive: {
    backgroundColor: "var(--color-red-500, #dc2626)",
    color: "white",
  },
  outline: {
    color: "var(--button-outline-color, var(--color-ink))",
    backgroundColor: "transparent",
    boxShadow:
      "0 1px 2px color-mix(in oklab, var(--button-outline-shadow-color, var(--color-ink)) 8%, transparent)",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  subtle: {},
};

export function getButtonVariantStyle(
  variant: ButtonVariant,
  active?: boolean,
): ButtonVariantStyle {
  if (!active) return BUTTON_VARIANT_STYLES[variant];
  return {
    ...BUTTON_VARIANT_STYLES[variant],
    color: "var(--button-active-color, var(--color-emerald))",
  };
}

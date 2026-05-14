import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import "@/app-button/src/button.css";

export const BUTTON_SIZE_OPTIONS = ["sm", "md", "lg"] as const;
export const ICON_BUTTON_SIZE_OPTIONS = ["sm", "md", "lg"] as const;
export const BUTTON_VARIANT_OPTIONS = [
  "primary",
  "destructive",
  "outline",
  "ghost",
  "subtle",
] as const;

const BUTTON_BASE_CLASSNAME = "app-button";
const BUTTON_PILL_CLASSNAME = "app-button--pill";
const BUTTON_SIZE_CLASSNAMES: Record<ButtonSize, string> = {
  sm: "app-button--size-sm",
  md: "app-button--size-md",
  lg: "app-button--size-lg",
};
const ICON_BUTTON_SIZE_CLASSNAMES: Record<IconButtonSize, string> = {
  sm: "app-icon-button--size-sm",
  md: "app-icon-button--size-md",
  lg: "app-icon-button--size-lg",
};
const BUTTON_VARIANT_CLASSNAMES: Record<ButtonVariant, string> = {
  primary: "app-button--variant-primary",
  destructive: "app-button--variant-destructive",
  outline: "app-button--variant-outline",
  ghost: "app-button--variant-ghost",
  subtle: "app-button--variant-subtle",
};

type ButtonVariantStyle = {
  backgroundColor?: string;
  color?: string;
  boxShadow?: string;
};
const BUTTON_VARIANT_STYLES: Record<ButtonVariant, ButtonVariantStyle> = {
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
function getButtonVariantStyle(variant: ButtonVariant, active?: boolean): ButtonVariantStyle {
  if (!active) return BUTTON_VARIANT_STYLES[variant];
  return {
    ...BUTTON_VARIANT_STYLES[variant],
    color: "var(--color-emerald)",
  };
}

export type ButtonVariant = (typeof BUTTON_VARIANT_OPTIONS)[number];
export type ButtonSize = (typeof BUTTON_SIZE_OPTIONS)[number];
export type IconButtonSize = (typeof ICON_BUTTON_SIZE_OPTIONS)[number];

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
  icon?: ReactNode;
  size?: ButtonSize;
  pill?: boolean;
  variant?: ButtonVariant;
  children?: ReactNode;
};

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
> & {
  label: string;
  icon: ReactNode;
  size?: IconButtonSize;
  variant?: ButtonVariant;
  active?: boolean;
  showTooltip?: boolean;
  tooltipClassName?: string;
};

export function Button({
  label,
  icon,
  size = "md",
  pill = false,
  variant = "primary",
  className,
  style,
  children,
  ...props
}: ButtonProps) {
  const content = children ?? (
    <>
      {icon}
      {label ? <span>{label}</span> : null}
    </>
  );

  return (
    <button
      type="button"
      aria-label={props["aria-label"] ?? label}
      className={cn(
        BUTTON_BASE_CLASSNAME,
        BUTTON_SIZE_CLASSNAMES[size],
        pill && BUTTON_PILL_CLASSNAME,
        BUTTON_VARIANT_CLASSNAMES[variant],
        className,
      )}
      style={{ ...getButtonVariantStyle(variant), ...style }}
      {...props}
    >
      {content}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  size = "md",
  variant = "subtle",
  active = false,
  showTooltip = true,
  tooltipClassName,
  className,
  style,
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={label}
      className={cn(
        BUTTON_BASE_CLASSNAME,
        ICON_BUTTON_SIZE_CLASSNAMES[size],
        BUTTON_VARIANT_CLASSNAMES[variant],
        className,
      )}
      style={{ ...getButtonVariantStyle(variant, active), ...style }}
      {...props}
    >
      {icon}
    </button>
  );

  if (!showTooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className={tooltipClassName}>{label}</TooltipContent>
    </Tooltip>
  );
}

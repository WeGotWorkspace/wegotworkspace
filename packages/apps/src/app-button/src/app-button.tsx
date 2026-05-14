import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  APP_BUTTON_BASE_CLASSNAME,
  APP_BUTTON_SIZE_CLASSNAMES,
  APP_BUTTON_VARIANT_CLASSNAMES,
  APP_ICON_BUTTON_SIZE_CLASSNAMES,
  getButtonVariantStyle,
} from "@/app-button/src/app-button.styles";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

type AppVariant = keyof typeof APP_BUTTON_VARIANT_CLASSNAMES;

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
  icon?: ReactNode;
  size?: keyof typeof APP_BUTTON_SIZE_CLASSNAMES;
  variant?: AppVariant;
  children?: ReactNode;
};

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  label: string;
  icon: ReactNode;
  size?: keyof typeof APP_ICON_BUTTON_SIZE_CLASSNAMES;
  variant?: AppVariant;
  active?: boolean;
  showTooltip?: boolean;
  tooltipClassName?: string;
};

export function Button({
  label,
  icon,
  size = "md",
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
        APP_BUTTON_BASE_CLASSNAME,
        APP_BUTTON_SIZE_CLASSNAMES[size],
        APP_BUTTON_VARIANT_CLASSNAMES[variant],
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
        APP_BUTTON_BASE_CLASSNAME,
        APP_ICON_BUTTON_SIZE_CLASSNAMES[size],
        APP_BUTTON_VARIANT_CLASSNAMES[variant],
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

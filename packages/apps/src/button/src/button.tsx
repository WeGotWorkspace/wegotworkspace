import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "@/button/src/button.css";
import {
  BUTTON_BASE_CLASSNAME,
  BUTTON_ICON_SLOT_CLASSNAME,
  BUTTON_PILL_CLASSNAME,
  BUTTON_SIZE_CLASSNAMES,
  BUTTON_VARIANT_CLASSNAMES,
  getButtonVariantStyle,
  type ButtonSize,
  type ButtonVariant,
} from "@/button/src/button.shared";
export {
  BUTTON_SIZE_OPTIONS,
  BUTTON_VARIANT_OPTIONS,
  ICON_BUTTON_SIZE_OPTIONS,
  type ButtonSize,
  type ButtonVariant,
  type IconButtonSize,
} from "@/button/src/button.shared";
export { IconButton } from "@/button/src/icon-button";
export type { IconButtonProps } from "@/button/src/icon-button";

export type ButtonProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  label?: string;
  icon?: ReactNode;
  size?: ButtonSize;
  pill?: boolean;
  variant?: ButtonVariant;
  children?: ReactNode;
};

export function Button({
  ref,
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
      {icon ? <span className={BUTTON_ICON_SLOT_CLASSNAME}>{icon}</span> : null}
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
      ref={ref}
    >
      {content}
    </button>
  );
}

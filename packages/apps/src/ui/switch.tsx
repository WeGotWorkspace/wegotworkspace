import * as React from "react";

import { BooleanSegmentedControl } from "@/segmented-control/src/segmented-control";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  React.ComponentPropsWithoutRef<typeof BooleanSegmentedControl>,
  "value" | "onChange"
> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const Switch = React.forwardRef<HTMLDivElement, SwitchProps>(
  ({ checked = false, onCheckedChange, className, disabled, size = "sm", ...props }, ref) => (
    <BooleanSegmentedControl
      ref={ref}
      value={checked}
      onChange={(next) => onCheckedChange?.(next)}
      disabled={disabled}
      size={size}
      className={cn(className)}
      {...props}
    />
  ),
);
Switch.displayName = "Switch";

export { Switch };

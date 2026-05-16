import type { ComponentType } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

type MeetCircleToggleProps = {
  on: boolean;
  onClick: () => void;
  OnIcon: ComponentType<{ className?: string }>;
  OffIcon: ComponentType<{ className?: string }>;
  label: string;
  large?: boolean;
};

export function MeetCircleToggle({
  on,
  onClick,
  OnIcon,
  OffIcon,
  label,
  large,
}: MeetCircleToggleProps) {
  const Icon = on ? OnIcon : OffIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "meet-circle-toggle",
            large ? "meet-circle-toggle--lg" : "meet-circle-toggle--sm",
            on ? "meet-circle-toggle--on" : "meet-circle-toggle--off",
          )}
          aria-label={label}
        >
          <Icon className={large ? "size-5" : "size-4"} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

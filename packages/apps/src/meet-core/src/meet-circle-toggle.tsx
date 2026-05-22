import type { ComponentType } from "react";
import { IconButton } from "@/button/src/button";

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
    <IconButton
      onClick={onClick}
      label={label}
      icon={<Icon />}
      size={large ? "lg" : "md"}
      variant={on ? "subtle" : "destructive"}
    />
  );
}

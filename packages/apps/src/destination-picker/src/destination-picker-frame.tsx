import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DestinationPickerFrameProps = {
  breadcrumbs: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DestinationPickerFrame({
  breadcrumbs,
  children,
  className,
}: DestinationPickerFrameProps) {
  return (
    <div className={cn("destination-picker", className)}>
      {breadcrumbs}
      <div className="destination-picker__body">{children}</div>
    </div>
  );
}

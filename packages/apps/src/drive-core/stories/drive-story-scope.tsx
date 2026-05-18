import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "@/drive-core/src/drive-workspace.css";

/** Minimal workspace root for parent-scoped Drive CSS variables only. */
export function DriveStoryScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("drive-workspace", className)}>{children}</div>;
}

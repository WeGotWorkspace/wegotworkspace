import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "@/file-drop-overlay/src/file-drop-overlay.css";

export type FileDropOverlayProps = {
  children: ReactNode;
  className?: string;
};

export function FileDropOverlay({ children, className }: FileDropOverlayProps) {
  return (
    <div className={cn("file-drop-overlay", className)}>
      <div className="file-drop-overlay__card">{children}</div>
    </div>
  );
}

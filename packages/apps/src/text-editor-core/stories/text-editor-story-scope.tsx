import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

import "@/text-editor-core/src/text-editor.css";

export function TextEditorStoryScope({
  children,
  variant = "full",
}: {
  children: ReactNode;
  variant?: "full" | "format-bar";
}) {
  return (
    <div
      className={cn(
        "text-editor w-full overflow-hidden rounded-lg border border-border",
        variant === "full"
          ? "h-[min(900px,90dvh)]"
          : "text-editor--format-bar-story h-[min(420px,70dvh)]",
      )}
    >
      {children}
    </div>
  );
}

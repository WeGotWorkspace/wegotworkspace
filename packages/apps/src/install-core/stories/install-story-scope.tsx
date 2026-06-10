import type { ReactNode } from "react";
import { TooltipProvider } from "@/ui/tooltip";
import "@/install-core/src/install-workspace.css";

export function InstallStoryScope({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="install-workspace p-6 md:p-10"
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--color-cream, #ffffff)",
        }}
      >
        <div className="mx-auto max-w-2xl space-y-4">{children}</div>
      </div>
    </TooltipProvider>
  );
}

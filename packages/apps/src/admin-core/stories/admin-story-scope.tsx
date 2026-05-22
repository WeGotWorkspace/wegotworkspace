import type { ReactNode } from "react";
import "@/admin-core/src/admin-workspace.css";

export function AdminStoryScope({ children }: { children: ReactNode }) {
  return (
    <div
      className="admin-workspace"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--workspace-root-bg, var(--color-cream, #ffffff))",
      }}
    >
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}

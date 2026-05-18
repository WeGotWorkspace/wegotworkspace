import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "@/collection-empty-state/src/collection-empty-state.css";

export type CollectionEmptyStateProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CollectionEmptyState({ icon, children, className }: CollectionEmptyStateProps) {
  return (
    <div className={cn("collection-empty-state", className)}>
      <div className="collection-empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      {children}
    </div>
  );
}

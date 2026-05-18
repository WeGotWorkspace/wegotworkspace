import type { ReactNode } from "react";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { cn } from "@/lib/utils";
import "@/collection-state/src/collection-state.css";

export type CollectionStateProps = {
  /** Empty folder cloud/files icon; ignored when {@link variant} is `"loading"`. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "loading";
};

export function CollectionState({
  variant = "default",
  icon,
  children,
  className,
}: CollectionStateProps) {
  if (variant === "loading") {
    return (
      <div
        className={cn("collection-state", "collection-state--loading", className)}
        role="status"
        aria-live="polite"
      >
        <div className="collection-state__icon collection-state__icon--loading">
          <LoadingSpinner size="lg" />
        </div>
        <p className="collection-state__loading-label">{children}</p>
      </div>
    );
  }

  return (
    <div className={cn("collection-state", className)}>
      <div className="collection-state__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="collection-state__body">{children}</div>
    </div>
  );
}

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/loading-spinner/src/loading-spinner.css";

type LoadingSpinnerProps = {
  size?: "sm" | "lg";
  label?: string;
  className?: string;
};

export function LoadingSpinner({ size = "lg", label, className }: LoadingSpinnerProps) {
  const icon = (
    <Loader2
      className={cn(
        "loading-spinner animate-spin",
        size === "sm" ? "loading-spinner--sm" : "loading-spinner--lg",
        label ? undefined : className,
      )}
      aria-hidden={label ? true : undefined}
    />
  );

  if (!label) {
    return icon;
  }

  return (
    <div className={cn("loading-spinner-block", className)} role="status" aria-live="polite">
      {icon}
      <p className="loading-spinner-block__label">{label}</p>
    </div>
  );
}

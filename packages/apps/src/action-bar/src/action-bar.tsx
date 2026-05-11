import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export type ActionBarProps = {
  /** Shown only below the `md` breakpoint; typically closes the mobile detail stack. */
  onBack?: () => void;
  backLabel?: string;
  /** Primary actions (e.g. reply), placed after the back control on small screens. */
  left?: React.ReactNode;
  /** Secondary actions (e.g. archive), aligned to the trailing edge. */
  right?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function ActionBar({
  onBack,
  backLabel = "Back",
  left,
  right,
  className,
  style,
}: ActionBarProps) {
  return (
    <nav
      className={cn(
        "px-4 md:px-12 h-16 md:h-20 border-b flex items-center shrink-0 gap-3",
        className,
      )}
      style={{
        borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
        ...style,
      }}
    >
      {onBack ? (
        <button
          type="button"
          aria-label={backLabel}
          onClick={onBack}
          className="md:hidden size-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:opacity-90"
          style={{
            color: "var(--color-ink)",
          }}
        >
          <ArrowLeft className="size-4" />
        </button>
      ) : null}
      {left != null ? <div className="flex items-center gap-2 shrink-0">{left}</div> : null}
      <div className="flex-1 min-w-0" />
      {right != null ? <div className="flex items-center gap-2 shrink-0">{right}</div> : null}
    </nav>
  );
}

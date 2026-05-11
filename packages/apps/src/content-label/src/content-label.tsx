import { cn } from "@/lib/utils";

export type ContentLabelProps = {
  text: string;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Compact rounded label for content metadata (mailbox, status, tags).
 */
export function ContentLabel({ text, icon, className, style }: ContentLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[11px] uppercase tracking-[0.2em] font-medium",
        className,
      )}
      style={{
        color: "var(--color-ink)",
        backgroundColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
        ...style,
      }}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate">{text}</span>
    </span>
  );
}

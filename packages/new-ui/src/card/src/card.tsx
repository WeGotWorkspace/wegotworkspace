import type { ReactNode } from "react";

export type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, children, className }: CardProps) {
  return (
    <section
      className={`rounded-xl border p-6 mb-6 ${className ?? ""}`.trim()}
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-ink) 3%, transparent)",
        borderColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
      }}
    >
      {title && (
        <h2
          className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-4"
          style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

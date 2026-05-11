import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

export type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  iconActions?: CardIconAction[];
};

export type CardIconAction = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function CardIconActionButton({ icon, label, onClick, disabled }: CardIconAction) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className="size-8 rounded-md flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)] disabled:opacity-50 disabled:pointer-events-none"
          style={{ color: "var(--color-ink)" }}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Card({ title, children, className, action, iconActions }: CardProps) {
  return (
    <section
      className={`rounded-xl border p-6 mb-6 ${className ?? ""}`.trim()}
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-ink) 3%, transparent)",
        borderColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
      }}
    >
      {(title || action || (iconActions && iconActions.length > 0)) && (
        <div className="flex items-center justify-between mb-4 gap-2">
          {title ? (
            <h2
              className="text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {iconActions && iconActions.length > 0 ? (
            <div className="flex items-center gap-1">
              {iconActions.map((iconAction) => (
                <CardIconActionButton key={iconAction.label} {...iconAction} />
              ))}
            </div>
          ) : (
            action
          )}
        </div>
      )}
      {children}
    </section>
  );
}

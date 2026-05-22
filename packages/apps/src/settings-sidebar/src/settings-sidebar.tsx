import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { Plus } from "lucide-react";

export function SidebarAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="size-6 rounded-full flex items-center justify-center transition-colors opacity-60 hover:opacity-100 hover:bg-[color-mix(in_oklab,var(--color-ink)_10%,transparent)]"
          style={{ color: "var(--color-ink)" }}
        >
          <Plus className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarGroup({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-4 mb-3 flex items-center justify-between">
        <h3
          className="text-[10px] uppercase tracking-[0.2em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
        >
          {label}
        </h3>
        {action}
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

export function SidebarLink({
  children,
  icon,
  active,
  onClick,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  badge,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  isDropTarget?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm rounded transition-all"
        style={{
          backgroundColor: isDropTarget
            ? "color-mix(in oklab, var(--color-ink) 22%, transparent)"
            : active
              ? "color-mix(in oklab, var(--color-ink) 12%, transparent)"
              : "transparent",
          color: isDropTarget
            ? "var(--color-ink)"
            : active
              ? "var(--color-ink)"
              : "color-mix(in oklab, var(--color-ink) 75%, transparent)",
          boxShadow: isDropTarget
            ? "inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 35%, transparent)"
            : "none",
        }}
      >
        <span className="flex-1 min-w-0 inline-flex items-center gap-2.5 truncate">
          {icon != null && (
            <span
              aria-hidden
              className="shrink-0"
              style={{
                opacity: active ? 0.9 : 0.65,
              }}
            >
              {icon}
            </span>
          )}
          <span className="min-w-0 truncate">{children}</span>
        </span>
        {badge != null && badge !== false && (
          <span
            className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-semibold tabular-nums rounded-full"
            style={{
              backgroundColor: active
                ? "var(--color-ink)"
                : "color-mix(in oklab, var(--color-ink) 14%, transparent)",
              color: active
                ? "var(--sidebar-badge-fg, var(--color-cream, #ffffff))"
                : "color-mix(in oklab, var(--color-ink) 80%, transparent)",
            }}
          >
            {badge}
          </span>
        )}
      </button>
    </li>
  );
}

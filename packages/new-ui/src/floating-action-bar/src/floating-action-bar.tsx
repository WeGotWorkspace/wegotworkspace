import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

export type FloatingActionBarButton = {
  id?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

type FloatingActionBarProps = {
  items: number;
  buttons: FloatingActionBarButton[];
  children?: React.ReactNode;
  className?: string;
};

export function FloatingActionBar({ items, buttons, children, className }: FloatingActionBarProps) {
  return (
    <div
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-2 rounded-full shadow-lg whitespace-nowrap",
        className,
      )}
      style={{ backgroundColor: "var(--color-ink)", color: "var(--color-cream, #f5f1e8)" }}
    >
      <span className="text-xs px-3 font-medium tabular-nums leading-9 inline-flex items-center">
        {items} selected
      </span>
      {buttons.map((button) => (
        <Tooltip key={button.id ?? button.label}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={button.onClick}
              aria-label={button.label}
              className="size-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              {button.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent>{button.label}</TooltipContent>
        </Tooltip>
      ))}
      {children}
    </div>
  );
}

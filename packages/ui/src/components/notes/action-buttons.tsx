import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ListAction({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className="size-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            color: "color-mix(in oklab, var(--color-ink) 65%, transparent)",
            backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ToolbarButton({
  label,
  children,
  onClick,
  active,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          onClick={onClick}
          className="size-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            color: active
              ? "var(--color-emerald)"
              : "color-mix(in oklab, var(--color-ink) 70%, transparent)",
            backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function FabButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className="size-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

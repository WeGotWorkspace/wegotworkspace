import { CheckSquare2 } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { cn } from "@/lib/utils";
import "@/multi-selection-view/src/multi-selection-view.css";

export type MultiSelectionViewAction = {
  id?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
};

export type MultiSelectionViewProps = {
  count: number;
  actions?: MultiSelectionViewAction[];
  className?: string;
  label?: string;
  title?: string | ((count: number) => string);
  icon?: React.ReactNode;
};

function defaultTitle(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"} selected`;
}

export function MultiSelectionView({
  count,
  actions = [],
  className,
  label = "Multiple selection",
  title = defaultTitle,
  icon,
}: MultiSelectionViewProps) {
  const resolvedTitle = typeof title === "function" ? title(count) : title;

  return (
    <article
      className={cn(
        "mx-auto flex max-w-[680px] flex-col items-center pt-12 md:pt-14 text-center",
        className,
      )}
    >
      <div
        className="mb-6 flex size-20 items-center justify-center rounded-full"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
          color: "color-mix(in oklab, var(--color-ink) 70%, transparent)",
        }}
      >
        {icon ?? <CheckSquare2 className="size-9" strokeWidth={1.5} />}
      </div>

      <div
        className="mb-3 text-[11px] uppercase tracking-[0.2em]"
        style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
      >
        {label}
      </div>

      <h1
        className="font-sans text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl"
        style={{ color: "var(--color-ink)" }}
      >
        {resolvedTitle}
      </h1>

      {actions.length > 0 ? (
        <div className="multi-selection-view__actions mt-6 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <IconButton
              key={action.id ?? action.label}
              label={action.label}
              onClick={action.onClick}
              active={action.active}
              icon={action.icon}
              size="lg"
              variant="subtle"
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

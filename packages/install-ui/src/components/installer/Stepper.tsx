import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepId } from "./types";

interface Step {
  id: StepId;
  label: string;
}

export const STEPS: Step[] = [
  { id: "welcome", label: "Welcome" },
  { id: "checks", label: "Server" },
  { id: "database", label: "Database" },
  { id: "site", label: "Site" },
  { id: "mail", label: "Mail" },
  { id: "voice", label: "Voice" },
  { id: "account", label: "Account" },
  { id: "success", label: "Done" },
];

export function Stepper({ current }: { current: StepId }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Installation progress" className="w-full">
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <li key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary bg-background text-primary shadow-[0_0_0_4px_var(--brand-red-soft)]",
                    !done &&
                      !active &&
                      "border-border bg-background text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded-full transition-colors sm:mx-2",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

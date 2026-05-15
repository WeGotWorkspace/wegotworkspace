import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/ui/label";

export type FormDisplayFieldProps = {
  label: string;
  children: ReactNode;
  readOnly?: boolean;
  icon?: ReactNode;
  /** Root row layout (spacing, theme). */
  className?: string;
  labelClassName?: string;
};

/**
 * Label + children for values that are not RHF-controlled (read-only or external state).
 * For bound inputs, use {@link FormTextField} or `FormField` from `@/ui/form`.
 */
export function FormDisplayField({
  label,
  children,
  readOnly,
  icon,
  className,
  labelClassName,
}: FormDisplayFieldProps) {
  return (
    <div className={cn("space-y-1.5 mb-4 last:mb-0", className)}>
      <Label
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground",
          labelClassName,
        )}
      >
        {icon}
        {label}
        {readOnly ? <Lock className="size-3 opacity-60" aria-hidden /> : null}
      </Label>
      {children}
    </div>
  );
}

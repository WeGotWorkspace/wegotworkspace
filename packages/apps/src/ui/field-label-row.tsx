import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/ui/label";

import "./field-label-row.css";

export type FieldLabelRowProps = {
  label: string;
  children: ReactNode;
  readOnly?: boolean;
  icon?: ReactNode;
  /** Merged onto the outer row (e.g. workspace layout hooks). */
  className?: string;
  /** Merged onto the label (e.g. theme overrides). */
  labelClassName?: string;
  /** Associates the label with the control's `id` (WCAG: every input needs a label). */
  htmlFor?: string;
};

/**
 * Label + control stack shared by simple forms (admin, settings display rows, card demos).
 * Not the RHF `FormField` from `@/ui/form`.
 */
export function FieldLabelRow({
  label,
  children,
  readOnly,
  icon,
  className,
  labelClassName,
  htmlFor,
}: FieldLabelRowProps) {
  return (
    <div className={cn("field-label-row", className)}>
      <Label htmlFor={htmlFor} className={cn("field-label-row__label", labelClassName)}>
        {icon}
        {label}
        {readOnly ? <Lock className="field-label-row__lock" aria-hidden /> : null}
      </Label>
      {children}
    </div>
  );
}

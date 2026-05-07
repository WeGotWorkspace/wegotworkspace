import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Label } from "@/ui/label";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  readOnly?: boolean;
  icon?: ReactNode;
  className?: string;
};

export function FormField({ label, children, readOnly, icon, className }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 mb-4 last:mb-0 ${className ?? ""}`.trim()}>
      <Label
        className="text-xs uppercase tracking-wider font-medium flex items-center gap-1.5"
        style={{ color: "color-mix(in oklab, var(--color-ink) 60%, transparent)" }}
      >
        {icon}
        {label}
        {readOnly && <Lock className="size-3 opacity-60" aria-hidden />}
      </Label>
      {children}
    </div>
  );
}

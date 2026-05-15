import { cn } from "@/lib/utils";
import { Button, type ButtonSize, type ButtonVariant } from "@/button/src/button";

export type FormSaveActionRowProps = {
  label: string;
  disabled?: boolean;
  onSave: () => void | Promise<void>;
  /** Row wrapper (alignment, spacing). */
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * Right-aligned primary form action using the shared `Button` primitive.
 */
export function FormSaveActionRow({
  label,
  disabled,
  onSave,
  className,
  variant = "subtle",
  size = "md",
}: FormSaveActionRowProps) {
  return (
    <div className={cn("flex justify-end pt-2", className)}>
      <Button
        type="button"
        onClick={() => void onSave()}
        disabled={disabled}
        label={label}
        variant={variant}
        size={size}
      />
    </div>
  );
}

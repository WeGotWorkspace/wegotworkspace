import type { ReactNode } from "react";
import { IconButton } from "@/button/src/button";
import { Switch } from "@/ui/switch";

export function IconActionButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <IconButton
      label={label}
      icon={children}
      onClick={onClick}
      disabled={disabled}
      size="sm"
      variant="subtle"
      style={{ color: "var(--color-ink)" }}
    />
  );
}

export function FeatureRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 border-t first:border-t-0"
      style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {label}
        </div>
        <div
          className="text-xs"
          style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
        >
          {desc}
        </div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

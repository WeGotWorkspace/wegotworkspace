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
      className="admin-icon-action"
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
    <div className="admin-feature-row">
      <div className="min-w-0">
        <div className="admin-feature-row__title">{label}</div>
        <div className="admin-feature-row__desc">{desc}</div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

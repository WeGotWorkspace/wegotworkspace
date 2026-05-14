import { ChevronDown } from "lucide-react";
import { DropdownMenu } from "@/menu-dropdown/src/dropdown-menu";
import type { DropdownMenuItemProps } from "@/menu-dropdown/src/dropdown-menu";
import "@/app-switcher/src/app-switcher.css";

export type AppSwitcherItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked?: boolean;
  onSelect: () => void;
};

export type AppSwitcherProps = {
  tagline?: string;
  subtitle?: string;
  items: AppSwitcherItem[];
  disabled?: boolean;
  menuContentClassName?: string;
  menuContentStyle?: React.CSSProperties;
};

export function AppSwitcher({
  tagline = "We got",
  subtitle = "Apps",
  items,
  disabled = false,
  menuContentClassName,
  menuContentStyle,
}: AppSwitcherProps) {
  const menuItems: DropdownMenuItemProps[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    checked: item.checked,
    onClick: item.onSelect,
  }));
  return (
    <DropdownMenu
      trigger={
        <button type="button" disabled={disabled} className="app-switcher__trigger">
          <span className="app-switcher__label">
            {tagline ? <span className="app-switcher__label-top">{tagline}</span> : null}
            <span>{subtitle}</span>
          </span>
          <span className="app-switcher__chevron-stack">
            <span aria-hidden />
            <ChevronDown className="app-switcher__chevron" aria-hidden />
          </span>
        </button>
      }
      items={menuItems}
      disabled={disabled}
      contentClassName={menuContentClassName}
      contentStyle={menuContentStyle}
    />
  );
}

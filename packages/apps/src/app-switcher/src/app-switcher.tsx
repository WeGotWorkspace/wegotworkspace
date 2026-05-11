import { LabeledDropdownMenu } from "@/menu-dropdown/src/labeled-dropdown-menu";
import type { MenuDropdownItemProps } from "@/menu-dropdown/src/menu-dropdown";

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
  const menuItems: MenuDropdownItemProps[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    checked: item.checked,
    onClick: item.onSelect,
  }));
  return (
    <LabeledDropdownMenu
      labelTop={tagline}
      labelBottom={subtitle}
      items={menuItems}
      disabled={disabled}
      contentClassName={menuContentClassName}
      contentStyle={menuContentStyle}
    />
  );
}

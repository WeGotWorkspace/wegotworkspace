import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { MenuItem, type MenuItemProps } from "@/menu-item/src/menu-item";
import { cn } from "@/lib/utils";
import "@/menu-dropdown/src/menu-dropdown.css";

export type MenuDropdownItemProps = MenuItemProps & { id?: string };

export type MenuDropdownProps = {
  trigger: React.ReactNode;
  items: MenuDropdownItemProps[];
  disabled?: boolean;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
};

export function MenuDropdown({
  trigger,
  items,
  disabled = false,
  align = "start",
  sideOffset = 8,
  contentClassName,
  contentStyle,
}: MenuDropdownProps) {
  if (disabled) return <>{trigger}</>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={sideOffset}
        className={cn("menu-dropdown__content", contentClassName)}
        style={contentStyle}
      >
        {items.map((item, index) => (
          <DropdownMenuItem
            key={item.id ?? `${index}-${String(item.label)}`}
            asChild
            className="menu-dropdown__item"
          >
            <MenuItem
              {...item}
              tone="inherit"
              className={cn("menu-dropdown__menu-item", item.className)}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

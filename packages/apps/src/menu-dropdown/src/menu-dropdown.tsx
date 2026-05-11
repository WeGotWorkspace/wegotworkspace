import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { MenuItem, type MenuItemProps } from "@/menu-item/src/menu-item";
import { cn } from "@/lib/utils";

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
        className={contentClassName}
        style={contentStyle}
      >
        {items.map((item) => (
          <DropdownMenuItem key={item.id ?? item.label} asChild className="cursor-pointer p-0">
            <MenuItem
              {...item}
              tone="inherit"
              className={cn("gap-2.5 px-2.5 py-2 rounded-md", item.className)}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

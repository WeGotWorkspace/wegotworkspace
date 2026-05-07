import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { MenuItem, type MenuItemProps } from "@/menu-item/src/menu-item";

type SidebarSectionProps = {
  title?: string;
  onAdd?: () => void;
  addLabel?: string;
  items?: MenuItemProps[];
  children?: React.ReactNode;
};

export function SidebarSection({
  title,
  onAdd,
  addLabel = "Add item",
  items,
  children,
}: SidebarSectionProps) {
  return (
    <div>
      {title ? (
        <div className="px-4 mb-3 flex items-center justify-between">
          <h3
            className="text-[11px] uppercase tracking-[0.2em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
          >
            {title}
          </h3>
          {onAdd ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={addLabel}
                  onClick={onAdd}
                  className="size-6 rounded-full flex items-center justify-center transition-colors opacity-60 hover:opacity-100 hover:bg-[color-mix(in_oklab,var(--color-ink)_10%,transparent)]"
                  style={{ color: "var(--color-ink)" }}
                >
                  <Plus className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{addLabel}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
      <ul className="space-y-1">
        {items
          ? items.map((item) => (
              <li key={item.label}>
                <MenuItem {...item} />
              </li>
            ))
          : children}
      </ul>
    </div>
  );
}

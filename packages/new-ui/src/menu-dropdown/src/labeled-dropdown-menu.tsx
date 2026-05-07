import { ChevronDown } from "lucide-react";
import { MenuDropdown } from "@/menu-dropdown/src/menu-dropdown";
import type { MenuDropdownItemProps } from "@/menu-dropdown/src/menu-dropdown";

export type LabeledDropdownMenuProps = {
  labelTop?: string;
  labelBottom: string;
  items: MenuDropdownItemProps[];
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
};

/**
 * Reusable two-line label trigger paired with a dropdown menu.
 */
export function LabeledDropdownMenu({
  labelTop,
  labelBottom,
  items,
  contentClassName,
  contentStyle,
}: LabeledDropdownMenuProps) {
  return (
    <MenuDropdown
      trigger={
        <button
          type="button"
          className="group inline-flex items-stretch gap-2 rounded-lg pr-2 pl-1 py-1 -ml-1 transition-colors hover:bg-[color-mix(in_oklab,currentColor_8%,transparent)]"
        >
          <span
            className="flex flex-col items-start leading-[0.85] tracking-wide text-left uppercase text-3xl"
            style={{ fontFamily: "var(--font-app)" }}
          >
            {labelTop ? <span className="opacity-60">{labelTop}</span> : null}
            <span>{labelBottom}</span>
          </span>
          <span className="grid grid-rows-2 leading-[0.85]">
            <span aria-hidden />
            <ChevronDown
              className="size-4 opacity-50 self-center transition-transform group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </span>
        </button>
      }
      items={items}
      contentClassName={contentClassName}
      contentStyle={contentStyle}
    />
  );
}

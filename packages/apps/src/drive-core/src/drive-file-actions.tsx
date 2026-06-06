import { MoreHorizontal } from "lucide-react";
import type { ActionBarAction } from "@/action-bar/src/action-bar";
import { IconButton } from "@/button/src/button";
import { DropdownMenu } from "@/menu-dropdown/src/dropdown-menu";

export function DriveFileItemActionsMenu({ actions }: { actions: ActionBarAction[] }) {
  return (
    <DropdownMenu
      align="end"
      sideOffset={6}
      contentClassName="min-w-40"
      items={actions.map((action) => ({
        id: action.id,
        label: action.label,
        icon: action.icon,
        onClick: action.onClick,
        checked: action.active,
        className:
          action.id === "delete"
            ? "cursor-pointer gap-2.5 text-red-600 focus:text-red-600"
            : "cursor-pointer gap-2.5",
      }))}
      trigger={
        <IconButton
          label="More actions"
          icon={<MoreHorizontal />}
          size="sm"
          variant="subtle"
          showTooltip={false}
          onClick={(event) => event.stopPropagation()}
        />
      }
    />
  );
}

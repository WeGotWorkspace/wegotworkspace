import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { meetLabels } from "@/meet-core/src/meet-labels";

type MeetUserMenuProps = {
  displayName: string;
  onLogout?: () => void;
};

export function MeetUserMenu({ displayName, onLogout }: MeetUserMenuProps) {
  const initials = displayName
    .split(/\s+/)
    .map((segment) => segment[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="meet-user-menu-trigger" aria-label="User menu">
          {initials || "U"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="meet-menu-surface">
        <DropdownMenuItem className="text-xs opacity-60 focus:bg-transparent">
          {displayName}
        </DropdownMenuItem>
        {onLogout ? (
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
            <LogOut className="mr-2 size-4" /> {meetLabels.signOut}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

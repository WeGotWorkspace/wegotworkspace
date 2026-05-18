import { MoreHorizontal } from "lucide-react";
import { ActionBar, type ActionBarAction } from "@/action-bar/src/action-bar";

type DriveDetailActionBarProps = {
  actions: ActionBarAction[];
  onClose: () => void;
  mobile?: boolean;
};

export function DriveDetailActionBar({ actions, onClose, mobile }: DriveDetailActionBarProps) {
  return (
    <ActionBar
      onBack={onClose}
      backLabel={mobile ? "Back" : "Close"}
      backIcon={mobile ? "back" : "close"}
      rightActions={actions}
      rightMenuLabel="More actions"
      rightMenuIcon={<MoreHorizontal />}
      className="drive-detail-actions px-4 md:px-6 h-14 md:h-16 border-b shrink-0"
    />
  );
}

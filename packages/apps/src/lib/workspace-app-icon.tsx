import { cn } from "@/lib/utils";
import { workspaceAppIconUiSrc, type WorkspaceAppId } from "@/lib/workspace-app-icons";

type WorkspaceAppIconProps = {
  appId: WorkspaceAppId;
  className?: string;
};

/** Branded workspace app icon — exact user artwork via `/app-icons/{app}.png`. */
export function WorkspaceAppIcon({ appId, className }: WorkspaceAppIconProps) {
  return (
    <img
      src={workspaceAppIconUiSrc(appId)}
      alt=""
      className={cn("block shrink-0 object-cover", className)}
      draggable={false}
    />
  );
}

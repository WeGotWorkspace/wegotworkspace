import { cn } from "@/lib/utils";
import { workspaceAppIconSrc, type WorkspaceAppId } from "@/lib/workspace-app-icons";

type WorkspaceAppIconProps = {
  appId: WorkspaceAppId;
  className?: string;
  size?: number;
};

/** Branded workspace app icon from `/pwa-icons/` assets. */
export function WorkspaceAppIcon({ appId, className, size = 192 }: WorkspaceAppIconProps) {
  return (
    <img
      src={workspaceAppIconSrc(appId, size)}
      alt=""
      className={cn("block shrink-0 object-cover", className)}
      draggable={false}
    />
  );
}

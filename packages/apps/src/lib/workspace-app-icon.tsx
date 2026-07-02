import { cn } from "@/lib/utils";
import { workspaceAppIconInlineMarkup } from "@/lib/workspace-app-icon-svgs";
import { workspaceAppIconUiSrc, type WorkspaceAppId } from "@/lib/workspace-app-icons";
import "@/lib/workspace-app-icon.css";

export type WorkspaceAppIconVariant = "default" | "switch-trigger";

type WorkspaceAppIconProps = {
  appId: WorkspaceAppId;
  className?: string;
  /** `switch-trigger` inverts colors for the large app-switch lockup icon only. */
  variant?: WorkspaceAppIconVariant;
};

/** Branded workspace app icon — exact user vector artwork via `/app-icons/{app}.svg`. */
export function WorkspaceAppIcon({ appId, className, variant = "default" }: WorkspaceAppIconProps) {
  if (variant === "switch-trigger") {
    return (
      <span
        aria-hidden
        className={cn("workspace-app-icon--switch-trigger shrink-0", className)}
        // Same SVG source as default; CSS vars on `.workspace-app-icon--switch-trigger svg` invert layers.
        dangerouslySetInnerHTML={{ __html: workspaceAppIconInlineMarkup(appId) }}
      />
    );
  }

  return (
    <img
      src={workspaceAppIconUiSrc(appId)}
      alt=""
      className={cn("block shrink-0 object-cover", className)}
      draggable={false}
    />
  );
}

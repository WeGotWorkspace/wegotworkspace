import { X } from "lucide-react";
import { BrandMark } from "@/brand-mark/src/brand-mark";

type SidebarLogoProps = {
  showAppSwitcher?: boolean;
  /** When `showAppSwitcher` is true, render this node (e.g. `WorkspaceAppSwitcher` or presentational `AppSwitcher`). */
  appSwitcher?: React.ReactNode;
  onCloseMobile: () => void;
  closeButtonHoverClassName?: string;
};

export function SidebarLogo({
  showAppSwitcher = true,
  appSwitcher,
  onCloseMobile,
  closeButtonHoverClassName = "hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)]",
}: SidebarLogoProps) {
  return (
    <div className="p-6 md:p-8 flex items-center gap-3 justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <BrandMark className="w-auto shrink-0" fill="var(--sidebar-logo-brand-fill, var(--color-ink))" />
        {showAppSwitcher && appSwitcher ? appSwitcher : null}
      </div>
      <button
        aria-label="Close menu"
        onClick={onCloseMobile}
        className={`size-8 rounded-full flex items-center justify-center transition-colors md:hidden ${closeButtonHoverClassName}`}
        style={{ color: "var(--sidebar-logo-close-button-color, var(--color-ink))" }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

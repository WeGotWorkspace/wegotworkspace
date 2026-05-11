import { SidebarLogo } from "@/sidebar-logo/src/sidebar-logo";

type AppSidebarProps = {
  open: boolean;
  children: React.ReactNode;
  onCloseMobile: () => void;
  showAppSwitcher?: boolean;
  appSwitcher?: React.ReactNode;
  closeButtonHoverClassName?: string;
};

export function AppSidebar({
  open,
  children,
  onCloseMobile,
  showAppSwitcher = true,
  appSwitcher,
  closeButtonHoverClassName = "hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)]",
}: AppSidebarProps) {
  return (
    <aside
      data-open={open}
      className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[translate,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
        open
          ? "translate-x-0 w-72 md:w-64"
          : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
      }`}
      style={{
        backgroundColor: "var(--app-sidebar-bg, var(--mail-sidebar, var(--color-cream, #f5f1e8)))",
        borderColor:
          "var(--app-sidebar-border-color, color-mix(in oklab, var(--color-ink) 15%, transparent))",
        color: "var(--app-sidebar-color, var(--color-ink))",
      }}
    >
      <SidebarLogo
        onCloseMobile={onCloseMobile}
        showAppSwitcher={showAppSwitcher}
        appSwitcher={appSwitcher}
        closeButtonHoverClassName={closeButtonHoverClassName}
      />
      {children}
    </aside>
  );
}

export function AppSidebarScrim({ open, onClick }: { open: boolean; onClick: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300"
      onClick={onClick}
    />
  );
}

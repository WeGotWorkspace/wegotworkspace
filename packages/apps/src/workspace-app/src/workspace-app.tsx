import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CollectionListWorkspace } from "@/collection-layout/src/collection-layout";
import { TooltipProvider } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import { WorkspaceAppLayout } from "@/workspace-shell/src/workspace-app-layout";

export type WorkspaceAppChrome = {
  sidebarOpen: boolean;
  detailOpenMobile: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openMobileDetail: () => void;
  closeMobileDetail: () => void;
};

export type WorkspaceAppHandle = {
  openMobileDetail: () => void;
  closeMobileDetail: () => void;
  closeSidebar: () => void;
};

export type WorkspaceAppProps = {
  tooltipDelayDuration?: number;
  workspaceRoot: {
    style?: React.CSSProperties;
    className?: string;
  };
  sidebar: (chrome: WorkspaceAppChrome) => ReactNode;
  list: (chrome: WorkspaceAppChrome) => {
    header: ReactNode;
    listContent: ReactNode;
    hasItems: boolean;
    emptyLabel: string;
    floatingActionBar?: ReactNode;
  };
  /** Fixed toolbar above the scrollable detail body (e.g. back + item actions). */
  actionBar?: (chrome: WorkspaceAppChrome) => ReactNode;
  detail: (chrome: WorkspaceAppChrome) => ReactNode;
  detailBackgroundColor?: string;
  detailClassName?: string;
  /** Applied to the scroll container around `detail` (padding, overflow). */
  detailScrollClassName?: string;
};

const MAIN_SLIDE =
  "flex min-h-0 flex-col overflow-hidden absolute md:relative inset-0 md:inset-auto z-20 md:z-auto md:flex-1 transition-[translate] duration-300 ease-out md:transition-none";

const DETAIL_SCROLL = "min-h-0 flex-1 overflow-y-auto px-6 md:px-12 py-10 md:py-16";

/**
 * Two-pane workspace: app sidebar, list column, and detail panel with shared
 * mobile sidebar + detail-stack behavior. Use {@link WorkspaceAppHandle} from
 * a ref when list selection should open the detail on small screens (`WorkspaceAppHandle`).
 */
export const WorkspaceApp = forwardRef<WorkspaceAppHandle, WorkspaceAppProps>(function WorkspaceApp(
  {
    tooltipDelayDuration = 300,
    workspaceRoot,
    sidebar,
    list,
    actionBar,
    detail,
    detailBackgroundColor = "var(--color-cream, #f5f1e8)",
    detailClassName,
    detailScrollClassName,
  },
  ref,
) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 767px)").matches;
  });
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);

  const openMobileDetail = useCallback(() => setDetailOpenMobile(true), []);
  const closeMobileDetail = useCallback(() => setDetailOpenMobile(false), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const chrome: WorkspaceAppChrome = useMemo(
    () => ({
      sidebarOpen,
      detailOpenMobile,
      toggleSidebar,
      closeSidebar,
      openMobileDetail,
      closeMobileDetail,
    }),
    [
      sidebarOpen,
      detailOpenMobile,
      toggleSidebar,
      closeSidebar,
      openMobileDetail,
      closeMobileDetail,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      openMobileDetail,
      closeMobileDetail,
      closeSidebar,
    }),
    [openMobileDetail, closeMobileDetail, closeSidebar],
  );

  const listProps = list(chrome);

  return (
    <TooltipProvider delayDuration={tooltipDelayDuration}>
      <WorkspaceAppLayout style={workspaceRoot.style} className={workspaceRoot.className}>
        {sidebar(chrome)}
        <CollectionListWorkspace
          detailOpenMobile={detailOpenMobile}
          header={listProps.header}
          listContent={listProps.listContent}
          hasItems={listProps.hasItems}
          emptyLabel={listProps.emptyLabel}
          floatingActionBar={listProps.floatingActionBar}
        />
        <main
          className={cn(
            MAIN_SLIDE,
            "workspace-detail-pane",
            detailOpenMobile ? "translate-x-0" : "translate-x-full md:translate-x-0",
            detailClassName,
          )}
          style={{
            backgroundColor: detailBackgroundColor,
            containerType: "inline-size",
            containerName: "workspace-detail",
          }}
        >
          {actionBar?.(chrome)}
          <div className={cn(DETAIL_SCROLL, detailScrollClassName)}>{detail(chrome)}</div>
        </main>
      </WorkspaceAppLayout>
    </TooltipProvider>
  );
});

WorkspaceApp.displayName = "WorkspaceApp";

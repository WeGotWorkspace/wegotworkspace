import type { MenuItemProps } from "@/menu-item/src/menu-item";
import { TooltipProvider } from "@/ui/tooltip";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import {
  WorkspaceAppLayout,
} from "@/workspace-shell/src/workspace-app-layout";
import { ViewHeader } from "@/view-header/src/view-header";
import { cn } from "@/lib/utils";
import type { InstallWorkspaceProps } from "@/install-core/src/install-workspace-props";
import {
  useInstallController,
  type InstallControllerState,
} from "@/install-core/src/use-install-controller";
import { installStepTitle } from "@/install-core/src/install-labels";
import { useInstallSidebarModel } from "@/install-core/src/use-install-sidebar-model";
import { InstallWelcomePane } from "@/install-core/src/install-welcome-pane";
import { InstallServerPane } from "@/install-core/src/install-server-pane";
import { InstallDatabasePane } from "@/install-core/src/install-database-pane";
import { InstallDavPane } from "@/install-core/src/install-dav-pane";
import { InstallMailPane } from "@/install-core/src/install-mail-pane";
import { InstallMeetPane } from "@/install-core/src/install-meet-pane";
import { InstallAdminPane } from "@/install-core/src/install-admin-pane";
import { InstallDonePane } from "@/install-core/src/install-done-pane";
import { InstallWizardActions } from "@/install-core/src/install-wizard-actions";
import "@/install-core/src/install-workspace.css";

export function InstallWorkspace({
  data,
  operations,
  onInstallRedirect,
  onOpenAdmin,
  className,
}: InstallWorkspaceProps) {
  const controller = useInstallController({ data, operations, onInstallRedirect });
  const sections = useInstallSidebarModel();
  const currentSection =
    sections.find((candidate) => candidate.id === controller.step.id) ?? sections[0]!;

  return (
    <TooltipProvider delayDuration={300}>
      <WorkspaceAppLayout
        className={cn("install-workspace", className)}
        sidebar={<Sidebar controller={controller} sections={sections} />}
        mainHeader={
          <MainHeader controller={controller} currentSection={currentSection} />
        }
        main={<MainContent controller={controller} onOpenAdmin={onOpenAdmin} />}
      />
    </TooltipProvider>
  );
}

function Sidebar({
  controller,
  sections,
}: {
  controller: InstallControllerState;
  sections: ReturnType<typeof useInstallSidebarModel>;
}) {
  const { stepIdx, sidebarOpen, setSidebarOpen, goToStep } = controller;

  const sidebarItems: MenuItemProps[] = sections.map((candidate, index) => {
    const reachable = index <= stepIdx;
    return {
      label: candidate.label,
      icon: candidate.icon,
      selected: index === stepIdx,
      checked: index < stepIdx,
      onClick: reachable ? () => goToStep(index) : undefined,
    };
  });

  return (
    <AppSidebar
      open={sidebarOpen}
      onCloseMobile={() => setSidebarOpen(false)}
      appSwitchDisabled
      appSwitchSubtitle="Workspace"
      footer={
        <div className="install-sidebar-step-footer">
          Step {stepIdx + 1} of {sections.length}
        </div>
      }
    >
      <SidebarSection title="Setup steps" items={sidebarItems} />
    </AppSidebar>
  );
}

function MainHeader({
  controller,
  currentSection,
}: {
  controller: InstallControllerState;
  currentSection: ReturnType<typeof useInstallSidebarModel>[number];
}) {
  const { stepIdx, steps, sidebarOpen, setSidebarOpen } = controller;
  const progressPercent = ((stepIdx + 1) / steps.length) * 100;

  return (
    <ViewHeader
      title={installStepTitle(currentSection.id)}
      subtitle={`Step ${stepIdx + 1} of ${steps.length} · ${currentSection.description}`}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      actions={
        <div
          className="install-view-header-progress"
          role="progressbar"
          aria-valuenow={stepIdx + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Setup progress, step ${stepIdx + 1} of ${steps.length}`}
        >
          <div
            className="install-view-header-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      }
    />
  );
}

function MainContent({
  controller,
  onOpenAdmin,
}: {
  controller: InstallControllerState;
  onOpenAdmin?: () => void;
}) {
  const { step, alreadyInstalled } = controller;

  return (
    <>
      {!alreadyInstalled && step.id === "welcome" ? <InstallWelcomePane /> : null}
      {!alreadyInstalled && step.id === "server" ? <InstallServerPane controller={controller} /> : null}
      {!alreadyInstalled && step.id === "database" ? (
        <InstallDatabasePane controller={controller} />
      ) : null}
      {!alreadyInstalled && step.id === "dav" ? <InstallDavPane controller={controller} /> : null}
      {!alreadyInstalled && step.id === "mail" ? <InstallMailPane controller={controller} /> : null}
      {!alreadyInstalled && step.id === "meet" ? <InstallMeetPane controller={controller} /> : null}
      {!alreadyInstalled && step.id === "admin" ? <InstallAdminPane controller={controller} /> : null}
      {step.id === "done" ? <InstallDonePane onOpenAdmin={onOpenAdmin} /> : null}

      {!alreadyInstalled && step.id !== "done" ? (
        <InstallWizardActions controller={controller} />
      ) : null}
    </>
  );
}

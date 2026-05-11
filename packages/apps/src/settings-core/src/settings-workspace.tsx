import { Mail as MailIcon, Users } from "lucide-react";
import { Input } from "@/ui/input";
import { AppButton } from "@/app-button/src/app-button";
import { AppSidebar, AppSidebarScrim } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import {
  WorkspaceAppLayout,
  WorkspaceSidebarToggle,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { Card } from "@/card/src/card";
import { FormField } from "@/form-field/src/form-field";
import { useSettingsController } from "@/settings-core/src/use-settings-controller";
import type { SettingsWorkspaceProps } from "@/settings-core/src/settings-workspace-props";

function securityLabel(security: string): string {
  if (!security) return "Unknown";
  if (security.toLowerCase() === "ssl") return "SSL/TLS";
  return security.toUpperCase();
}

export function SettingsWorkspace(props: SettingsWorkspaceProps) {
  const { data, session, operations } = props;
  const logoutHref = props.logoutTo === false ? null : (props.logoutTo ?? data.logoutUrl ?? "/");
  const controller = useSettingsController({ data, operations });
  const sidebarItems = controller.sections.map((candidate) => ({
    label: candidate.label,
    icon: candidate.icon,
    selected: controller.section === candidate.id,
    onClick: () => controller.selectSection(candidate.id),
  }));

  return (
    <WorkspaceAppLayout
      className="notes-root"
      style={{
        ["--workspace-root-bg" as string]: "var(--color-cream, #f5f1e8)",
        ["--app-sidebar-bg" as string]: "#da9fb8",
        ["--app-sidebar-border-color" as string]:
          "color-mix(in oklab, var(--color-ink) 15%, transparent)",
        ["--app-sidebar-color" as string]: "var(--color-ink)",
        ["--workspace-sidebar-toggle-color" as string]: "var(--color-ink)",
        ["--workspace-sidebar-toggle-bg" as string]:
          "color-mix(in oklab, var(--color-ink) 6%, transparent)",
        ["--workspace-user-footer-text-color" as string]:
          "color-mix(in oklab, var(--color-ink) 80%, transparent)",
        ["--workspace-user-footer-border-color" as string]:
          "color-mix(in oklab, var(--color-ink) 18%, transparent)",
        ["--workspace-user-footer-avatar-bg" as string]:
          "color-mix(in oklab, var(--color-ink) 18%, transparent)",
        ["--workspace-user-footer-avatar-color" as string]: "var(--color-ink)",
        ["--workspace-user-footer-link-color" as string]: "var(--color-ink)",
        ["--workspace-user-footer-link-bg" as string]:
          "color-mix(in oklab, var(--color-ink) 10%, transparent)",
      }}
    >
      <AppSidebar
        open={controller.sidebarOpen}
        onCloseMobile={() => controller.setSidebarOpen(false)}
        appSwitcher={<WorkspaceAppSwitcher />}
      >
        <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
          <SidebarSection title="Account" items={sidebarItems} />
        </nav>

        <WorkspaceUserFooter
          name={session.user.displayName}
          initials={workspaceUserInitials(session.user)}
          detailLine={session.user.username}
          onLogoutClick={() => {
            if (logoutHref) window.location.assign(logoutHref);
          }}
          linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
        />
      </AppSidebar>
      <AppSidebarScrim
        open={controller.sidebarOpen}
        onClick={() => controller.setSidebarOpen(false)}
      />

      <section
        className="flex-1 flex flex-col min-w-0 relative"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <header
          className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b shrink-0"
          style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
        >
          <div className="flex items-center gap-3">
            <WorkspaceSidebarToggle
              open={controller.sidebarOpen}
              onToggle={() => controller.setSidebarOpen((value) => !value)}
              hoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
            />

            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl md:text-3xl leading-none truncate"
                style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
              >
                {controller.currentSection.label}
              </h1>
              <p
                className="text-xs mt-1 truncate"
                style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
              >
                {controller.currentSection.description}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12">
            {controller.section === "profile" && (
              <>
                <Card title="Identity">
                  <FormField label="Username" readOnly>
                    <Input
                      value={controller.profile.username}
                      readOnly
                      className="cursor-default"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                      }}
                    />
                  </FormField>
                  <FormField label="Display name">
                    <Input
                      value={controller.profile.displayName}
                      onChange={(event) =>
                        controller.profile.setDisplayName(event.currentTarget.value)
                      }
                    />
                  </FormField>
                  <FormField label="Email">
                    <Input
                      type="email"
                      value={controller.profile.email}
                      onChange={(event) => controller.profile.setEmail(event.currentTarget.value)}
                    />
                  </FormField>
                  <div className="flex justify-end pt-2">
                    <AppButton
                      onClick={controller.profile.saveProfile}
                      disabled={
                        !controller.profile.profileDirty &&
                        !controller.profile.newPassword &&
                        !controller.profile.confirmPassword
                      }
                      label="Save changes"
                      variant="subtle"
                      size="md"
                      style={{
                        backgroundColor: "var(--settings-sidebar, #da9fb8)",
                        color: "var(--color-ink)",
                      }}
                    />
                  </div>
                </Card>

                <Card title="Password">
                  <FormField label="New password">
                    <Input
                      type="password"
                      value={controller.profile.newPassword}
                      onChange={(event) =>
                        controller.profile.setNewPassword(event.currentTarget.value)
                      }
                      placeholder="At least 8 characters"
                    />
                  </FormField>
                  <FormField label="Confirm password">
                    <Input
                      type="password"
                      value={controller.profile.confirmPassword}
                      onChange={(event) =>
                        controller.profile.setConfirmPassword(event.currentTarget.value)
                      }
                    />
                  </FormField>
                  <div className="flex justify-end pt-2">
                    <AppButton
                      onClick={controller.profile.saveProfile}
                      disabled={
                        !controller.profile.newPassword && !controller.profile.confirmPassword
                      }
                      label="Set password"
                      variant="subtle"
                      size="md"
                      style={{
                        backgroundColor: "var(--settings-sidebar, #da9fb8)",
                        color: "var(--color-ink)",
                      }}
                    />
                  </div>
                </Card>
              </>
            )}

            {controller.section === "memberships" && (
              <Card title="Groups">
                <ul
                  className="divide-y"
                  style={{
                    borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                  }}
                >
                  {controller.memberships.map((group) => (
                    <li
                      key={group.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      style={{
                        borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                      }}
                    >
                      <UserAvatar
                        displayName={group.displayName}
                        compact
                        size="sm"
                        className="shrink-0 gap-0 [--user-avatar-bg:var(--settings-sidebar,#da9fb8)] [--user-avatar-fg:var(--color-ink)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {group.displayName}
                        </div>
                        <div
                          className="text-xs truncate"
                          style={{
                            color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
                          }}
                        >
                          {group.id}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {controller.section === "mail" && (
              <>
                <Card title="Credentials">
                  <FormField label="Username">
                    <Input
                      value={controller.mail.imapUsername}
                      onChange={(event) =>
                        controller.mail.setImapUsername(event.currentTarget.value)
                      }
                    />
                  </FormField>
                  <FormField label="Password">
                    <Input
                      type="password"
                      value={controller.mail.imapPassword}
                      onChange={(event) =>
                        controller.mail.setImapPassword(event.currentTarget.value)
                      }
                      placeholder={controller.mail.imapHasPassword ? "••••••••" : "Enter password"}
                    />
                  </FormField>
                  <div className="flex justify-end pt-2">
                    <AppButton
                      onClick={controller.mail.saveMail}
                      disabled={!controller.mail.mailDirty}
                      label="Save changes"
                      variant="subtle"
                      size="md"
                      style={{
                        backgroundColor: "var(--settings-sidebar, #da9fb8)",
                        color: "var(--color-ink)",
                      }}
                    />
                  </div>
                </Card>

                <Card title="IMAP (incoming)">
                  <FormField
                    label="Server"
                    readOnly
                    icon={<MailIcon className="size-3.5 opacity-70" />}
                  >
                    <Input
                      value={controller.mail.server.imapHost}
                      readOnly
                      className="cursor-default"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                      }}
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Port" readOnly>
                      <Input
                        value={String(controller.mail.server.imapPort)}
                        readOnly
                        className="cursor-default"
                        style={{
                          backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                        }}
                      />
                    </FormField>
                    <FormField label="Security" readOnly>
                      <Input
                        value={securityLabel(controller.mail.server.imapSecurity)}
                        readOnly
                        className="cursor-default"
                        style={{
                          backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                        }}
                      />
                    </FormField>
                  </div>
                </Card>

                <Card title="SMTP (outgoing)">
                  <FormField
                    label="Server"
                    readOnly
                    icon={<MailIcon className="size-3.5 opacity-70" />}
                  >
                    <Input
                      value={controller.mail.server.smtpHost}
                      readOnly
                      className="cursor-default"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                      }}
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Port" readOnly>
                      <Input
                        value={String(controller.mail.server.smtpPort)}
                        readOnly
                        className="cursor-default"
                        style={{
                          backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                        }}
                      />
                    </FormField>
                    <FormField label="Security" readOnly>
                      <Input
                        value={securityLabel(controller.mail.server.smtpSecurity)}
                        readOnly
                        className="cursor-default"
                        style={{
                          backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                        }}
                      />
                    </FormField>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </section>
    </WorkspaceAppLayout>
  );
}

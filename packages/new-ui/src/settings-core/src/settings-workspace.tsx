import { useMemo } from "react";
import {
  LogOut,
  Mail as MailIcon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { Input } from "@/ui/input";
import { AppButton } from "@/app-button/src/app-button";
import { SidebarGroup, SidebarLink } from "@/settings-sidebar/src/settings-sidebar";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { FormCard } from "@/form-card/src/form-card";
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
  const initials = useMemo(
    () => session.user.initials ?? session.user.displayName.slice(0, 2).toUpperCase(),
    [session.user.displayName, session.user.initials],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-dvh w-full overflow-hidden relative notes-root"
        style={{
          backgroundColor: "var(--color-cream, #f5f1e8)",
          fontFamily: "var(--font-sans)",
          ["--settings-sidebar" as string]: "#da9fb8",
        }}
      >
        <aside
          data-open={controller.sidebarOpen}
          className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[transform,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
            controller.sidebarOpen
              ? "translate-x-0 w-72 md:w-64"
              : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
          }`}
          style={{
            backgroundColor: "var(--settings-sidebar)",
            borderColor: "color-mix(in oklab, var(--color-ink) 15%, transparent)",
            color: "var(--color-ink)",
          }}
        >
          <div className="p-6 md:p-8 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 165 227"
                className="w-auto shrink-0"
                style={{ height: "54px", marginTop: "-5px" }}
                fill="none"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893"
                />
              </svg>
              <WorkspaceAppSwitcher />
            </div>
            <button
              aria-label="Close menu"
              onClick={() => controller.setSidebarOpen(false)}
              className="size-8 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)] md:hidden"
              style={{ color: "var(--color-ink)" }}
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <SidebarGroup label="Account">
              {controller.sections.map((candidate) => (
                <SidebarLink
                  key={candidate.id}
                  active={controller.section === candidate.id}
                  onClick={() => controller.selectSection(candidate.id)}
                  icon={candidate.icon}
                >
                  {candidate.label}
                </SidebarLink>
              ))}
            </SidebarGroup>
          </nav>

          <div
            className="p-4 md:p-6 flex items-center gap-2 shrink-0 border-t"
            style={{
              color: "color-mix(in oklab, var(--color-ink) 80%, transparent)",
              borderColor: "color-mix(in oklab, var(--color-ink) 18%, transparent)",
            }}
          >
            <div
              className="size-9 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-ink) 18%, transparent)",
                color: "var(--color-ink)",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--color-ink)" }}>
              {session.user.displayName}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                {logoutHref ? (
                  <a
                    href={logoutHref}
                    aria-label="Log out"
                    className="size-9 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
                    style={{
                      color: "var(--color-ink)",
                      backgroundColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                    }}
                  >
                    <LogOut className="size-4" />
                  </a>
                ) : (
                  <span
                    aria-hidden
                    className="size-9 rounded-full flex items-center justify-center opacity-50"
                    style={{
                      color: "var(--color-ink)",
                      backgroundColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                    }}
                  >
                    <LogOut className="size-4" />
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {controller.sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300"
            onClick={() => controller.setSidebarOpen(false)}
          />
        )}

        <section
          className="flex-1 flex flex-col min-w-0 relative"
          style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
        >
          <header
            className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b shrink-0"
            style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
          >
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={controller.sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    onClick={() => controller.setSidebarOpen((value) => !value)}
                    className="size-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
                    style={{
                      color: "var(--color-ink)",
                      backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                    }}
                  >
                    <Menu className="size-4 md:hidden" />
                    {controller.sidebarOpen ? (
                      <PanelLeftClose className="size-4 hidden md:block" />
                    ) : (
                      <PanelLeftOpen className="size-4 hidden md:block" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {controller.sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                </TooltipContent>
              </Tooltip>

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
                  <FormCard title="Identity">
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
                  </FormCard>

                  <FormCard title="Password">
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
                  </FormCard>
                </>
              )}

              {controller.section === "memberships" && (
                <FormCard title="Groups">
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
                </FormCard>
              )}

              {controller.section === "mail" && (
                <>
                  <FormCard title="Credentials">
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
                        placeholder={
                          controller.mail.imapHasPassword ? "••••••••" : "Enter password"
                        }
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
                  </FormCard>

                  <FormCard title="IMAP (incoming)">
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
                            backgroundColor:
                              "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                          }}
                        />
                      </FormField>
                      <FormField label="Security" readOnly>
                        <Input
                          value={securityLabel(controller.mail.server.imapSecurity)}
                          readOnly
                          className="cursor-default"
                          style={{
                            backgroundColor:
                              "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                          }}
                        />
                      </FormField>
                    </div>
                  </FormCard>

                  <FormCard title="SMTP (outgoing)">
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
                            backgroundColor:
                              "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                          }}
                        />
                      </FormField>
                      <FormField label="Security" readOnly>
                        <Input
                          value={securityLabel(controller.mail.server.smtpSecurity)}
                          readOnly
                          className="cursor-default"
                          style={{
                            backgroundColor:
                              "color-mix(in oklab, var(--color-ink) 4%, transparent)",
                          }}
                        />
                      </FormField>
                    </div>
                  </FormCard>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}

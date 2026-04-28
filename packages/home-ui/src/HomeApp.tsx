import { useState } from "react";
import {
  Cloud,
  FileText,
  Mail,
  Menu,
  Sheet,
  Sparkles,
  Presentation,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

type AppTile = {
  name: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconFg: string;
  enabled: boolean;
};

function SettingsUserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c2-4 5-6 8-6s6 2 8 6" />
    </svg>
  );
}

function VoiceMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="8" opacity="0.4" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function readConfig() {
  const fallback = {
    title: "WeGotWorkspace",
    realm: "SabreDAV",
    username: "",
    apps: {
      admin: "/admin/",
      settings: "/settings/",
      drive: "/drive/",
      mail: "/mail/",
      voice: "/voice/",
      notes: "/notes/",
      office: "/office/",
      officeDoc: "/office/editor?new=docx",
      officeSheet: "/office/editor?new=xlsx",
      officeSlides: "/office/editor?new=pptx",
    },
    logoutUrl: "/logout/",
    availability: {
      filesEnabled: true,
      drive: true,
      mail: true,
      voice: true,
      notes: true,
      office: true,
    },
  };
  const incoming = window.__SABRE_HOME_CONFIG__;
  if (!incoming) {
    return fallback;
  }
  return {
    title: incoming.title ?? fallback.title,
    realm: incoming.realm ?? fallback.realm,
    username: incoming.username ?? fallback.username,
    apps: {
      ...fallback.apps,
      ...(incoming.apps ?? {}),
    },
    logoutUrl: incoming.logoutUrl ?? fallback.logoutUrl,
    availability: {
      ...fallback.availability,
      ...(incoming.availability ?? {}),
    },
  };
}

export function HomeApp() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const config = readConfig();
  const apps: AppTile[] = [
    {
      name: "Admin",
      description: "Manage your workspace",
      href: config.apps.admin,
      icon: Cloud,
      iconBg: "oklch(0.65 0.22 264)",
      iconFg: "oklch(0.99 0 0)",
      enabled: true,
    },
    {
      name: "User settings",
      description: "Account and preferences",
      href: config.apps.settings,
      icon: SettingsUserIcon,
      iconBg: "oklch(0.65 0.22 264)",
      iconFg: "oklch(0.99 0 0)",
      enabled: true,
    },
    {
      name: "Voice",
      description: "Calls and rooms",
      href: config.apps.voice,
      icon: VoiceMarkIcon,
      iconBg: "oklch(0.48 0.095 168)",
      iconFg: "oklch(0.99 0.004 95)",
      enabled: Boolean(config.availability.voice),
    },
    {
      name: "Notes",
      description: "Personal notes and notebooks",
      href: config.apps.notes,
      icon: Sparkles,
      iconBg: "oklch(0.45 0.13 35)",
      iconFg: "oklch(0.985 0.008 85)",
      enabled: Boolean(config.availability.notes),
    },
    {
      name: "Mail",
      description: "Inbox and messages",
      href: config.apps.mail,
      icon: Mail,
      iconBg: "oklch(0.72 0.17 55)",
      iconFg: "oklch(0.18 0.015 60)",
      enabled: Boolean(config.availability.mail),
    },
    {
      name: "Drive",
      description: "Files and storage",
      href: config.apps.drive,
      icon: Cloud,
      iconBg: "oklch(0.32 0.08 265)",
      iconFg: "oklch(0.985 0.005 95)",
      enabled: Boolean(config.availability.drive),
    },
    {
      name: "Docs",
      description: "Create documents",
      href: config.apps.officeDoc,
      icon: FileText,
      iconBg: "var(--app-docs)",
      iconFg: "white",
      enabled: Boolean(config.availability.office),
    },
    {
      name: "Sheets",
      description: "Create spreadsheets",
      href: config.apps.officeSheet,
      icon: Sheet,
      iconBg: "var(--app-sheets)",
      iconFg: "white",
      enabled: Boolean(config.availability.office),
    },
    {
      name: "Slides",
      description: "Create presentations",
      href: config.apps.officeSlides,
      icon: Presentation,
      iconBg: "var(--app-slides)",
      iconFg: "white",
      enabled: Boolean(config.availability.office),
    },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">
            <Cloud />
          </span>
          <div>
            <div className="sidebar-title">Home</div>
            <div className="sidebar-subtitle">{config.title}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-label">Workspace</span>
          <a className="sidebar-link sidebar-link-active" href={config.apps.office}>
            App launcher
          </a>
          <a className="sidebar-link" href={config.apps.settings}>
            My settings
          </a>
          <a className="sidebar-link" href={config.apps.admin}>
            Admin
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            {config.username ? `Signed in as ${config.username}` : "Signed in"}
          </div>
          <a className="action action-ghost" href={config.logoutUrl}>
            Sign out
          </a>
        </div>
      </aside>

      {mobileSidebarOpen ? (
        <div className="mobile-sidebar-overlay" onClick={() => setMobileSidebarOpen(false)}>
          <aside className="mobile-sidebar" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-sidebar-header">
              <div className="sidebar-brand">
                <span className="sidebar-brand-icon">
                  <Cloud />
                </span>
                <div>
                  <div className="sidebar-title">Home</div>
                  <div className="sidebar-subtitle">{config.title}</div>
                </div>
              </div>
              <button
                className="mobile-close"
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <X />
              </button>
            </div>

            <nav className="sidebar-nav">
              <span className="sidebar-label">Workspace</span>
              <a className="sidebar-link sidebar-link-active" href={config.apps.office}>
                App launcher
              </a>
              <a className="sidebar-link" href={config.apps.settings}>
                My settings
              </a>
              <a className="sidebar-link" href={config.apps.admin}>
                Admin
              </a>
            </nav>

            <div className="sidebar-footer">
              <div className="sidebar-user">
                {config.username ? `Signed in as ${config.username}` : "Signed in"}
              </div>
              <a className="action action-ghost" href={config.logoutUrl}>
                Sign out
              </a>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="page-shell">
        <header className="topbar">
          <button
            className="mobile-menu"
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu />
          </button>
          <div>
            <h1 className="brand-heading">WeGotWorkspace</h1>
          </div>
        </header>

        <section className="apps">
          <div className="apps-head">
            <h2>Apps</h2>
            <span>{apps.length} apps</span>
          </div>
          <ul className="grid">
            {apps.map((app) => (
              <li key={app.name}>
                {app.enabled ? (
                  <a href={app.href} className="tile">
                    <span className="icon" style={{ background: app.iconBg, color: app.iconFg }}>
                      <app.icon />
                    </span>
                    <span className="tile-title">{app.name}</span>
                    <span className="tile-subtitle">{app.description}</span>
                  </a>
                ) : (
                  <span className="tile tile-disabled" aria-disabled="true">
                    <span className="icon" style={{ background: app.iconBg, color: app.iconFg }}>
                      <app.icon />
                    </span>
                    <span className="tile-title">{app.name}</span>
                    <span className="tile-subtitle">Unavailable for this workspace</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

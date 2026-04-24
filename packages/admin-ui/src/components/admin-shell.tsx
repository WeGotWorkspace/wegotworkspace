import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Users, Mail, Phone, FolderCog, Cloud, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/store";

type NavItem = { to: string; label: string; icon: typeof Users; end?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Users & Groups", icon: Users, end: true },
  { to: "/mail", label: "Mail", icon: Mail },
  { to: "/voice", label: "Voice", icon: Phone },
  { to: "/webdav", label: "WebDAV", icon: FolderCog },
  { to: "/updates", label: "Updates", icon: Download },
];

export function AdminShell({ children }: { children?: React.ReactNode }) {
  const loc = useLocation();
  const { currentUser, logoutUrl, updates } = useSettings();
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center">
            <Cloud className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-sidebar-primary-foreground tracking-tight">
              Admin Console
            </div>
            <div className="text-[11px] text-sidebar-foreground/60 mt-0.5">
              WeGotWorkspace
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <div className="px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40">
            Settings
          </div>
          {nav.map((item) => {
            const active = item.end ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as "/"}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  {item.to === "/updates" && updates.updateAvailable && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  )}
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/40 flex items-center justify-center text-sidebar-primary-foreground text-sm font-medium">
              A
            </div>
            <div className="text-xs leading-tight">
              <div className="font-medium text-sidebar-primary-foreground">
                {currentUser !== "" ? currentUser : "Loading..."}
              </div>
              <div className="text-sidebar-foreground/50">signed in administrator</div>
            </div>
          </div>
          <a
            href={logoutUrl}
            className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            Sign out
          </a>
        </div>
      </aside>

      <div className="ml-64 min-h-screen flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface/80 backdrop-blur flex items-center px-6 gap-4">
          <div className="text-xs font-mono text-muted-foreground">
            <span className="text-muted-foreground/50">/admin</span>
            <span className="mx-1.5">›</span>
            <span className="text-foreground">
              {nav.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)))
                ?.label ?? "Settings"}
            </span>
          </div>
        </header>
        <main className="h-[calc(100vh-3.5rem)] overflow-auto">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-primary font-mono mb-2">
          {eyebrow}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 py-8 border-t border-border first:border-t-0 first:pt-0">
      <div>
        <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
        )}
        {aside && <div className="mt-3">{aside}</div>}
      </div>
      <div className="bg-surface border border-border rounded-lg p-6">{children}</div>
    </section>
  );
}

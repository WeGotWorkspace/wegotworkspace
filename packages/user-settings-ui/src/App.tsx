import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SettingsState = {
  user: {
    username: string;
    displayName: string;
    email: string;
  };
  groups: Array<{
    id: string;
    displayName: string;
  }>;
  mail: {
    imapUsername: string;
    imapHasPassword: boolean;
  };
  mailServer: {
    imapHost: string;
    imapPort: number;
    imapSecurity: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: string;
  };
  logoutUrl: string;
};

type PageKey = "profile" | "memberships" | "mail";

const PAGE_META: Record<PageKey, { title: string; eyebrow: string; description: string }> = {
  profile: {
    title: "Profile",
    eyebrow: "Identity",
    description: "Update your display name, email, and password.",
  },
  memberships: {
    title: "Memberships",
    eyebrow: "Access",
    description: "Read-only view of groups assigned to your account.",
  },
  mail: {
    title: "Mail settings",
    eyebrow: "Mail",
    description: "Manage your personal mail login and view server endpoints.",
  },
};

function IconUser({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c2-4 5-6 8-6s6 2 8 6" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c1.6-3.2 3.7-4.8 6-4.8 1.2 0 2.3.4 3.3 1.2" />
      <path d="M13.5 19c1.1-2.2 2.7-3.2 4.5-3.2 1 0 2 .3 2.8.9" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

const NAV_ITEMS: Array<{
  key: PageKey;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}> = [
  { key: "profile", label: "Profile", icon: IconUser },
  { key: "memberships", label: "Memberships", icon: IconUsers },
  { key: "mail", label: "Mail", icon: IconMail },
];

function currentPageFromLocation(): PageKey {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("/settings/memberships")) {
    return "memberships";
  }
  if (path.includes("/settings/mail")) {
    return "mail";
  }
  return "profile";
}

function settingsRootPath(): string {
  const path = window.location.pathname;
  const marker = "/settings";
  const markerIndex = path.indexOf(marker);
  if (markerIndex === -1) {
    return marker;
  }
  return path.slice(0, markerIndex + marker.length);
}

function adminRootPath(): string {
  return settingsRootPath().replace(/\/settings$/, "/admin");
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/settings/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await res.json()) as T | { error?: string };
  if (!res.ok) {
    const message =
      "error" in payload && typeof payload.error === "string" ? payload.error : "Request failed";
    throw new Error(message);
  }
  return payload as T;
}

export function App() {
  const [state, setState] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageKey>(() => currentPageFromLocation());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [mailSaving, setMailSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const next = await api<SettingsState>("state");
      setState(next);
      setDisplayName(next.user.displayName);
      setEmail(next.user.email);
      setImapUsername(next.mail.imapUsername);
      setImapPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPage(currentPageFromLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = (nextPage: PageKey) => {
    const root = settingsRootPath();
    const segment = nextPage === "profile" ? "" : `/${nextPage}`;
    const target = `${root}${segment}/`.replace(/\/+$/, "/");
    const current = `${window.location.pathname}/`.replace(/\/+$/, "/");
    if (current !== target) {
      window.history.pushState({}, "", target);
    }
    setPage(nextPage);
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [page]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const groupsLabel = useMemo(() => {
    if (!state || state.groups.length === 0) {
      return "No group memberships";
    }
    return `${state.groups.length} group${state.groups.length === 1 ? "" : "s"}`;
  }, [state]);
  const adminMailPanelUrl = `${adminRootPath()}/mail/`.replace(/\/+$/, "/");

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (profileSaving) {
      return;
    }
    setProfileSaving(true);
    try {
      const next = await api<SettingsState>("profile/save", {
        displayName,
        email,
        password: newPassword,
      });
      setState(next);
      setNewPassword("");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveMail = async (e: FormEvent) => {
    e.preventDefault();
    if (mailSaving) {
      return;
    }
    setMailSaving(true);
    try {
      const next = await api<SettingsState>("mail/save", {
        imapUsername,
        imapPassword,
      });
      setState(next);
      setImapPassword("");
      toast.success("Mail credentials updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save mail credentials");
    } finally {
      setMailSaving(false);
    }
  };

  if (loading && !state) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Could not load settings.
        <button
          className="mt-3 inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
          onClick={() => void load()}
        >
          Retry
        </button>
      </div>
    );
  }

  const meta = PAGE_META[page];
  const sidebarContent = (
    <>
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-semibold">
          U
        </div>
        <div className="leading-tight">
          <div className="font-display font-semibold text-sidebar-primary-foreground tracking-tight">
            Settings
          </div>
          <div className="text-[11px] text-sidebar-foreground/60 mt-0.5">WeGotWorkspace</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <div className="px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40">
          Settings
        </div>
        {NAV_ITEMS.map((item) => {
          const active = page === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigateTo(item.key)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/40 flex items-center justify-center text-sidebar-primary-foreground text-sm font-medium">
            {state.user.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-xs leading-tight">
            <div className="font-medium text-sidebar-primary-foreground">{state.user.displayName}</div>
            <div className="text-sidebar-foreground/50">@{state.user.username}</div>
          </div>
        </div>
        <a
          href={state.logoutUrl}
          className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          Sign out
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border md:flex md:flex-col">
        {sidebarContent}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation menu"
          />
          <aside
            id="settings-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Settings navigation"
            className="absolute inset-y-0 left-0 z-10 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col"
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="md:ml-64 min-h-screen flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface/80 backdrop-blur flex items-center px-4 md:px-6 gap-3 md:gap-4">
          <button
            type="button"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="settings-mobile-nav"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="text-xs font-mono text-muted-foreground">
            <span className="text-muted-foreground/50">/settings</span>
            <span className="mx-1.5">›</span>
            <span className="text-foreground">{meta.title}</span>
          </div>
        </header>

        <main className="h-[calc(100vh-3.5rem)] overflow-auto">
          <div className="px-10 py-10 max-w-6xl">
            <div className="flex items-end justify-between gap-6 mb-8">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-primary font-mono mb-2">
                  {meta.eyebrow}
                </div>
                <h1 className="font-display text-3xl font-semibold tracking-tight">{meta.title}</h1>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{meta.description}</p>
              </div>
            </div>

            {page === "profile" && (
              <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 py-8 border-t border-border first:border-t-0 first:pt-0">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight">Profile</h2>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Update your personal account details.
                  </p>
                </div>
                <div className="bg-surface border border-border rounded-lg p-6">
                  <div className="flex justify-end mb-4">
                    <span className="text-[11px] rounded-full border border-border px-2.5 py-1 font-mono text-muted-foreground">
                      @{state.user.username}
                    </span>
                  </div>
                  <form onSubmit={saveProfile} className="grid gap-4">
                    <Field label="Display name">
                      <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Your display name"
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@example.com"
                      />
                    </Field>
                    <Field label="New password (optional)">
                      <input
                        type="password"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Leave empty to keep current password"
                      />
                    </Field>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-95 disabled:opacity-60"
                      >
                        {profileSaving ? "Saving..." : "Save profile"}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}

            {page === "memberships" && (
              <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 py-8 border-t border-border first:border-t-0 first:pt-0">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    Memberships
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Read-only membership list managed by administrators.
                  </p>
                </div>
                <div className="bg-surface border border-border rounded-lg p-6">
                  <div className="flex justify-end mb-4">
                    <span className="text-[11px] rounded-full border border-border px-2.5 py-1 font-mono text-muted-foreground">
                      {groupsLabel}
                    </span>
                  </div>
                  {state.groups.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      You are not a member of any groups.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {state.groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center gap-4 p-3 border border-border rounded-md hover:border-primary/30 transition-colors"
                        >
                          <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4 text-accent-foreground"
                              aria-hidden="true"
                            >
                              <path d="M18 21a8 8 0 0 0-16 0" />
                              <circle cx="10" cy="8" r="5" />
                              <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{group.displayName}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {group.id.split("/").pop() || group.id}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {page === "mail" && (
              <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 py-8 border-t border-border first:border-t-0 first:pt-0">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    Mail settings
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Update your mail login. Server endpoints are read-only.
                  </p>
                </div>
                <div className="bg-surface border border-border rounded-lg p-6">
                  <div className="flex justify-end mb-4">
                    <span className="text-[11px] rounded-full border border-border px-2.5 py-1 font-mono text-muted-foreground">
                      {state.mail.imapHasPassword ? "Password saved" : "No password"}
                    </span>
                  </div>
                  <form onSubmit={saveMail} className="grid gap-4">
                    <Field label="Mail username">
                      <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={imapUsername}
                        onChange={(event) => setImapUsername(event.target.value)}
                        placeholder="IMAP account username"
                      />
                    </Field>
                    <Field label="Mail password">
                      <input
                        type="password"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={imapPassword}
                        onChange={(event) => setImapPassword(event.target.value)}
                        placeholder={
                          state.mail.imapHasPassword
                            ? "Leave empty to keep existing password"
                            : "Set your mail password"
                        }
                      />
                    </Field>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={mailSaving}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-95 disabled:opacity-60"
                      >
                        {mailSaving ? "Saving..." : "Save mail login"}
                      </button>
                    </div>
                  </form>

                  <div className="mt-6 border-t border-border pt-5">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">
                      Server settings (admin managed)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ReadonlyField label="IMAP host" value={state.mailServer.imapHost || "-"} />
                      <ReadonlyField label="IMAP port" value={String(state.mailServer.imapPort)} />
                      <ReadonlyField label="IMAP security" value={state.mailServer.imapSecurity} />
                      <ReadonlyField label="SMTP host" value={state.mailServer.smtpHost || "-"} />
                      <ReadonlyField label="SMTP port" value={String(state.mailServer.smtpPort)} />
                      <ReadonlyField label="SMTP security" value={state.mailServer.smtpSecurity} />
                    </div>
                    <div className="mt-4">
                      <a
                        href={adminMailPanelUrl}
                        className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        Open admin mail panel
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
        {label}
      </span>
      <input
        readOnly
        value={value}
        className="w-full rounded-md border border-input bg-muted/35 px-3 py-2 text-sm text-muted-foreground"
      />
    </label>
  );
}

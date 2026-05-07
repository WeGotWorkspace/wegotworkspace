import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Menu,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Users,
  Mail as MailIcon,
  Check,
  Lock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/ui/button";
import { SidebarGroup, SidebarLink } from "@/settings-sidebar/src/settings-sidebar";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";

export const Route = createFileRoute("/settings")({
  component: SettingsApp,
  head: () => ({
    meta: [
      { title: "Settings" },
      { name: "description", content: "Manage your account, memberships, and mail." },
      { name: "theme-color", content: "#da9fb8" },
      { name: "apple-mobile-web-app-title", content: "Settings" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/settings.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/settings-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/settings-192.png" },
    ],
  }),
});

type Section = "profile" | "memberships" | "mail";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "profile", label: "Profile", icon: <User className="size-3.5" />, description: "Your account details" },
  { id: "memberships", label: "Memberships", icon: <Users className="size-3.5" />, description: "Groups you belong to" },
  { id: "mail", label: "Mail", icon: <MailIcon className="size-3.5" />, description: "IMAP & SMTP credentials" },
];

const MEMBERSHIPS = [
  { name: "Editorial Team", role: "Editor", since: "Jan 2023" },
  { name: "Studio Crew", role: "Member", since: "Mar 2023" },
  { name: "Northlight Project", role: "Owner", since: "Aug 2024" },
  { name: "Bindery Workshop", role: "Member", since: "Sep 2024" },
];

function SettingsApp() {
  const [section, setSection] = useState<Section>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectSection = (s: Section) => {
    setSection(s);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

  const current = SECTIONS.find((s) => s.id === section)!;

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
        {/* Sidebar */}
        <aside
          data-open={sidebarOpen}
          className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[transform,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
            sidebarOpen
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 227" className="w-auto shrink-0" style={{ height: "54px", marginTop: "-5px" }} fill="none" aria-hidden="true">
                <path fill="currentColor" d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893"/>
              </svg>
              <WorkspaceAppSwitcher />
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
              className="size-8 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)] md:hidden"
              style={{ color: "var(--color-ink)" }}
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <SidebarGroup label="Account">
              {SECTIONS.map((s) => (
                <SidebarLink
                  key={s.id}
                  active={section === s.id}
                  onClick={() => selectSection(s.id)}
                  icon={s.icon}
                >
                  {s.label}
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
              EL
            </div>
            <div className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--color-ink)" }}>
              Elias Linden
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/"
                  aria-label="Log out"
                  className="size-9 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
                  style={{
                    color: "var(--color-ink)",
                    backgroundColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                  }}
                >
                  <LogOut className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main */}
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
                    aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="size-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
                    style={{
                      color: "var(--color-ink)",
                      backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                    }}
                  >
                    <Menu className="size-4 md:hidden" />
                    {sidebarOpen ? (
                      <PanelLeftClose className="size-4 hidden md:block" />
                    ) : (
                      <PanelLeftOpen className="size-4 hidden md:block" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{sidebarOpen ? "Hide sidebar" : "Show sidebar"}</TooltipContent>
              </Tooltip>

              <div className="flex-1 min-w-0">
                <h1
                  className="text-2xl md:text-3xl leading-none truncate"
                  style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
                >
                  {current.label}
                </h1>
                <p
                  className="text-xs mt-1 truncate"
                  style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
                >
                  {current.description}
                </p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12">
              {section === "profile" && <ProfilePanel />}
              {section === "memberships" && <MembershipsPanel />}
              {section === "mail" && <MailPanel />}
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl border p-6 mb-6"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-ink) 3%, transparent)",
        borderColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
      }}
    >
      {title && (
        <h2
          className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-4"
          style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  readOnly,
}: {
  label: string;
  children: React.ReactNode;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5 mb-4 last:mb-0">
      <Label
        className="text-xs uppercase tracking-wider font-medium flex items-center gap-1.5"
        style={{ color: "color-mix(in oklab, var(--color-ink) 60%, transparent)" }}
      >
        {label}
        {readOnly && <Lock className="size-3 opacity-60" aria-hidden />}
      </Label>
      {children}
    </div>
  );
}

function ProfilePanel() {
  const initial = {
    username: "elias.linden",
    displayName: "Elias Linden",
    email: "elias@northlight.studio",
  };
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [email, setEmail] = useState(initial.email);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");

  const dirty = displayName !== initial.displayName || email !== initial.email;

  const saveProfile = () => {
    toast("Profile saved", { icon: <Check className="size-4" /> });
  };

  const setPassword = () => {
    if (!pwd || pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    setPwd("");
    setPwd2("");
    toast("Password updated", { icon: <Check className="size-4" /> });
  };

  return (
    <>
      <Card title="Identity">
        <Field label="Username" readOnly>
          <Input
            value={initial.username}
            readOnly
            className="cursor-default"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)" }}
          />
        </Field>
        <Field label="Display name">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="flex justify-end pt-2">
          <Button
            onClick={saveProfile}
            disabled={!dirty}
            style={{ backgroundColor: "var(--settings-sidebar, #da9fb8)", color: "var(--color-ink)" }}
          >
            Save changes
          </Button>
        </div>
      </Card>

      <Card title="Password">
        <Field label="New password">
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm password">
          <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        </Field>
        <div className="flex justify-end pt-2">
          <Button
            onClick={setPassword}
            disabled={!pwd && !pwd2}
            style={{ backgroundColor: "var(--settings-sidebar, #da9fb8)", color: "var(--color-ink)" }}
          >
            Set password
          </Button>
        </div>
      </Card>
    </>
  );
}

function MembershipsPanel() {
  return (
    <Card title="Groups">
      <ul className="divide-y" style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}>
        {MEMBERSHIPS.map((m) => (
          <li key={m.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}>
            <div
              className="size-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--settings-sidebar, #da9fb8)",
                color: "var(--color-ink)",
              }}
            >
              <Users className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>{m.name}</div>
              <div className="text-xs truncate" style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}>
                Member since {m.since}
              </div>
            </div>
            <span
              className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full shrink-0"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
                color: "color-mix(in oklab, var(--color-ink) 75%, transparent)",
              }}
            >
              {m.role}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MailPanel() {
  const initialUser = "elias@northlight.studio";
  const [user, setUser] = useState(initialUser);
  const [pwd, setPwd] = useState("");

  const dirty = user !== initialUser || pwd.length > 0;

  const saveCreds = () => {
    setPwd("");
    toast("Mail credentials saved", { icon: <Check className="size-4" /> });
  };

  const ReadOnly = ({ value }: { value: string }) => (
    <Input value={value} readOnly className="cursor-default" style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)" }} />
  );

  return (
    <>
      <Card title="Credentials">
        <Field label="Username">
          <Input value={user} onChange={(e) => setUser(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" />
        </Field>
        <div className="flex justify-end pt-2">
          <Button
            onClick={saveCreds}
            disabled={!dirty}
            style={{ backgroundColor: "var(--settings-sidebar, #da9fb8)", color: "var(--color-ink)" }}
          >
            Save changes
          </Button>
        </div>
      </Card>

      <Card title="IMAP (incoming)">
        <Field label="Server" readOnly>
          <ReadOnly value="imap.northlight.studio" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port" readOnly>
            <ReadOnly value="993" />
          </Field>
          <Field label="Security" readOnly>
            <ReadOnly value="SSL/TLS" />
          </Field>
        </div>
      </Card>

      <Card title="SMTP (outgoing)">
        <Field label="Server" readOnly>
          <ReadOnly value="smtp.northlight.studio" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port" readOnly>
            <ReadOnly value="465" />
          </Field>
          <Field label="Security" readOnly>
            <ReadOnly value="SSL/TLS" />
          </Field>
        </div>
      </Card>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Menu,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Mail as MailIcon,
  Phone,
  Cloud,
  Check,
  Lock,
  Plus,
  Trash2,
  Pencil,
  UserPlus,
  KeyRound,
  Database,
  Download,
  FileArchive,
  RefreshCw,
  Eraser,
  CircleCheck,
  CircleAlert,
  CircleX,
  CircleDashed,
  PackageCheck,
  Rocket,
  Loader2,
} from "lucide-react";
import { Card } from "@/card/src/card";
import { Callout } from "@/callout/src/callout";
import { DataTable, type DataTableColumn } from "@/data-table/src/data-table";
import { MenuItem } from "@/menu-item/src/menu-item";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/app-button/src/app-button";
import { Switch } from "@/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import { SidebarGroup, SidebarLink } from "@/settings-sidebar/src/settings-sidebar";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { AdminApp as AdminCoreApp } from "@/admin-core/src/admin-app";
import { requireWgwAuth } from "@/lib/api/wgw/route-guard";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    requireWgwAuth(location);
  },
  component: AdminCoreApp,
  head: () => ({
    meta: [
      { title: "Admin" },
      { name: "description", content: "Server administration." },
      { name: "theme-color", content: "#2f302c" },
      { name: "apple-mobile-web-app-title", content: "Admin" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/admin.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/admin-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/admin-192.png" },
    ],
  }),
});

type Section = "users" | "mail" | "voice" | "webdav" | "backups" | "updates";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "users",
    label: "Users & Groups",
    icon: <Users className="size-3.5" />,
    description: "Manage accounts and group memberships",
  },
  {
    id: "mail",
    label: "Mail",
    icon: <MailIcon className="size-3.5" />,
    description: "Mail server configuration",
  },
  {
    id: "voice",
    label: "Voice",
    icon: <Phone className="size-3.5" />,
    description: "STUN / TURN signalling",
  },
  {
    id: "webdav",
    label: "WebDAV",
    icon: <Cloud className="size-3.5" />,
    description: "Server defaults and DAV features",
  },
  {
    id: "backups",
    label: "Backups",
    icon: <Database className="size-3.5" />,
    description: "Database and system backups",
  },
  {
    id: "updates",
    label: "Updates",
    icon: <Rocket className="size-3.5" />,
    description: "System updates and release status",
  },
];

const ACCENT = "#2f302c";

function LegacyAdminApp() {
  const [section, setSection] = useState<Section>("users");
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
          ["--admin-sidebar" as string]: ACCENT,
          ["--color-ink" as string]: "#ffffff",
          ["--sidebar-badge-fg" as string]: ACCENT,
        }}
      >
        <aside
          data-open={sidebarOpen}
          className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[transform,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
            sidebarOpen
              ? "translate-x-0 w-72 md:w-64"
              : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
          }`}
          style={{
            backgroundColor: ACCENT,
            borderColor: "color-mix(in oklab, #ffffff 15%, transparent)",
            color: "#ffffff",
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
              onClick={() => setSidebarOpen(false)}
              className="size-8 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,#ffffff_12%,transparent)] md:hidden"
              style={{ color: "#ffffff" }}
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <SidebarGroup label="Server">
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
              borderColor: "color-mix(in oklab, #ffffff 18%, transparent)",
            }}
          >
            <div
              className="size-9 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
              style={{
                backgroundColor: "color-mix(in oklab, #ffffff 18%, transparent)",
                color: "#ffffff",
              }}
            >
              EL
            </div>
            <div className="flex-1 min-w-0 text-sm truncate" style={{ color: "#ffffff" }}>
              Elias Linden
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/"
                  aria-label="Log out"
                  className="size-9 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,#ffffff_22%,transparent)]"
                  style={{
                    color: "#ffffff",
                    backgroundColor: "color-mix(in oklab, #ffffff 12%, transparent)",
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

        <section
          className="flex-1 flex flex-col min-w-0 relative"
          style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
        >
          <header
            className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b shrink-0"
            style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
          >
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="size-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[color-mix(in_oklab,#1a1a18_12%,transparent)]"
                    style={{
                      color: "#1a1a18",
                      backgroundColor: "color-mix(in oklab, #1a1a18 6%, transparent)",
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
                  style={{ fontFamily: "var(--font-serif)", color: "#1a1a18" }}
                >
                  {current.label}
                </h1>
                <p
                  className="text-xs mt-1 truncate"
                  style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
                >
                  {current.description}
                </p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto" style={{ ["--color-ink" as string]: "#1a1a18" }}>
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
              {section === "users" && <UsersGroupsPanel />}
              {section === "mail" && <MailPanel />}
              {section === "voice" && <VoicePanel />}
              {section === "webdav" && <WebDAVPanel />}
              {section === "backups" && <BackupsPanel />}
              {section === "updates" && <UpdatesPanel />}
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
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
        style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}
      >
        {label}
        {readOnly && <Lock className="size-3 opacity-60" aria-hidden />}
      </Label>
      {children}
    </div>
  );
}

function PrimaryButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      style={{ backgroundColor: ACCENT, color: "#ffffff", ...(props.style || {}) }}
    />
  );
}

/* ---------- Users & Groups ---------- */

type AdminUser = { id: string; username: string; displayName: string; email: string };
type Group = { id: string; name: string; members: string[] };

const SEED_USERS: AdminUser[] = [
  {
    id: "u1",
    username: "elias.linden",
    displayName: "Elias Linden",
    email: "elias@northlight.studio",
  },
  { id: "u2", username: "hana.ito", displayName: "Hana Ito", email: "hana@northlight.studio" },
  {
    id: "u3",
    username: "marcus.bell",
    displayName: "Marcus Bell",
    email: "marcus@northlight.studio",
  },
];

const SEED_GROUPS: Group[] = [
  { id: "g1", name: "Editors", members: ["u1", "u2"] },
  { id: "g2", name: "Studio", members: ["u1", "u2", "u3"] },
  { id: "g3", name: "Admins", members: ["u1"] },
];

function UsersGroupsPanel() {
  const [users, setUsers] = useState<AdminUser[]>(SEED_USERS);
  const [groups, setGroups] = useState<Group[]>(SEED_GROUPS);

  const [newUser, setNewUser] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [delUser, setDelUser] = useState<AdminUser | null>(null);

  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [newGroup, setNewGroup] = useState(false);
  const [delGroup, setDelGroup] = useState<Group | null>(null);

  const addUser = (u: Omit<AdminUser, "id">) => {
    setUsers((arr) => [...arr, { ...u, id: `u${Date.now()}` }]);
    toast("User created", { icon: <Check className="size-4" /> });
  };
  const updateUser = (u: AdminUser) => {
    setUsers((arr) => arr.map((x) => (x.id === u.id ? u : x)));
    toast("User updated", { icon: <Check className="size-4" /> });
  };
  const deleteUser = (id: string) => {
    setUsers((arr) => arr.filter((x) => x.id !== id));
    setGroups((arr) => arr.map((g) => ({ ...g, members: g.members.filter((m) => m !== id) })));
    toast("User deleted");
  };
  const addGroup = (name: string) => {
    setGroups((arr) => [...arr, { id: `g${Date.now()}`, name, members: [] }]);
    toast("Group created", { icon: <Check className="size-4" /> });
  };
  const updateGroup = (g: Group) => {
    setGroups((arr) => arr.map((x) => (x.id === g.id ? g : x)));
  };
  const deleteGroup = (id: string) => {
    setGroups((arr) => arr.filter((x) => x.id !== id));
    toast("Group deleted");
  };

  return (
    <>
      <Card
        title="Users"
        action={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="New user"
                onClick={() => setNewUser(true)}
                className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                style={{ color: "#1a1a18" }}
              >
                <UserPlus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>New user</TooltipContent>
          </Tooltip>
        }
      >
        <ul
          className="divide-y"
          style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
        >
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
            >
              <div
                className="size-9 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                style={{ backgroundColor: ACCENT, color: "#ffffff" }}
              >
                {u.displayName
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "#1a1a18" }}>
                  {u.displayName}
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
                >
                  @{u.username} · {u.email}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setEditUser(u)}
                      className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit user</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setPwUser(u)}
                      className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                    >
                      <KeyRound className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Set password</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDelUser(u)}
                      className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete user</TooltipContent>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Groups"
        action={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="New group"
                onClick={() => setNewGroup(true)}
                className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                style={{ color: "#1a1a18" }}
              >
                <Plus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>New group</TooltipContent>
          </Tooltip>
        }
      >
        <ul
          className="divide-y"
          style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
        >
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
            >
              <div
                className="size-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: ACCENT, color: "#ffffff" }}
              >
                <Users className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "#1a1a18" }}>
                  {g.name}
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
                >
                  {g.members.length} member{g.members.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setEditGroup(g)}
                      className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit group</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDelGroup(g)}
                      className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete group</TooltipContent>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {newUser && (
        <UserDialog
          open
          onOpenChange={(o) => !o && setNewUser(false)}
          title="New user"
          onSubmit={(u) => {
            addUser(u);
            setNewUser(false);
          }}
        />
      )}
      {editUser && (
        <UserDialog
          open
          onOpenChange={(o) => !o && setEditUser(null)}
          title="Edit user"
          initial={editUser}
          onSubmit={(u) => {
            updateUser({ ...editUser, ...u });
            setEditUser(null);
          }}
        />
      )}
      {pwUser && (
        <PasswordDialog
          open
          onOpenChange={(o) => !o && setPwUser(null)}
          user={pwUser}
          onSubmit={() => {
            toast("Password updated", { icon: <Check className="size-4" /> });
            setPwUser(null);
          }}
        />
      )}
      {newGroup && (
        <GroupDialog
          open
          onOpenChange={(o) => !o && setNewGroup(false)}
          title="New group"
          users={users}
          onSubmit={(name) => {
            addGroup(name);
            setNewGroup(false);
          }}
        />
      )}
      {editGroup && (
        <GroupDialog
          open
          onOpenChange={(o) => !o && setEditGroup(null)}
          title="Edit group"
          users={users}
          initial={editGroup}
          onSubmit={(name, members) => {
            updateGroup({ ...editGroup, name, members: members ?? editGroup.members });
            toast("Group saved", { icon: <Check className="size-4" /> });
            setEditGroup(null);
          }}
        />
      )}

      <AlertDialog open={!!delUser} onOpenChange={(o) => !o && setDelUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {delUser
                ? `${delUser.displayName} (@${delUser.username}) will be permanently removed and unassigned from all groups.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (delUser) deleteUser(delUser.id);
                setDelUser(null);
              }}
              style={{ backgroundColor: ACCENT, color: "#fff" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!delGroup} onOpenChange={(o) => !o && setDelGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              {delGroup ? `“${delGroup.name}” will be removed. Members keep their accounts.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (delGroup) deleteGroup(delGroup.id);
                setDelGroup(null);
              }}
              style={{ backgroundColor: ACCENT, color: "#fff" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function UserDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial?: AdminUser;
  onSubmit: (u: { username: string; displayName: string; email: string }) => void;
}) {
  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update display name and email. Username cannot be changed."
              : "Create a new user account."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Username" readOnly={!!initial}>
            <Input
              value={username}
              readOnly={!!initial}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jane.doe"
            />
          </Field>
          <Field label="Display name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={() => onSubmit({ username, displayName, email })}
            disabled={!username || !displayName || !email}
          >
            Save
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: AdminUser | null;
  onSubmit: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");

  const submit = () => {
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    setPwd("");
    setPwd2("");
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>Set a new password for {user?.displayName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="New password">
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PrimaryButton onClick={submit}>Update password</PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupDialog({
  open,
  onOpenChange,
  title,
  users,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  users: AdminUser[];
  initial?: Group;
  onSubmit: (name: string, members?: string[]) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [members, setMembers] = useState<string[]>(initial?.members ?? []);

  const toggle = (id: string) =>
    setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initial ? "Rename and assign members." : "Create a new group."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Group name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Editors" />
          </Field>
          {initial && (
            <Field label="Members">
              <ul
                className="rounded-md border max-h-56 overflow-y-auto divide-y"
                style={{
                  borderColor: "color-mix(in oklab, #1a1a18 12%, transparent)",
                }}
              >
                {users.map((u) => {
                  const checked = members.includes(u.id);
                  return (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[color-mix(in_oklab,#1a1a18_4%,transparent)]"
                      onClick={() => toggle(u.id)}
                    >
                      <div
                        className="size-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                        style={{ backgroundColor: ACCENT, color: "#fff" }}
                      >
                        {u.displayName
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0 text-sm truncate" style={{ color: "#1a1a18" }}>
                        {u.displayName}
                        <span
                          className="ml-2 text-xs"
                          style={{ color: "color-mix(in oklab, #1a1a18 50%, transparent)" }}
                        >
                          @{u.username}
                        </span>
                      </div>
                      <Switch
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggle(u.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={() => onSubmit(name, initial ? members : undefined)}
            disabled={!name.trim()}
          >
            Save
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Mail ---------- */

function MailPanel() {
  const initial = {
    imapHost: "imap.northlight.studio",
    imapPort: "993",
    imapSec: "SSL/TLS",
    smtpHost: "smtp.northlight.studio",
    smtpPort: "465",
    smtpSec: "SSL/TLS",
  };
  const [s, setS] = useState(initial);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((p) => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <Card title="IMAP (incoming)">
        <Field label="Server">
          <Input value={s.imapHost} onChange={set("imapHost")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port">
            <Input value={s.imapPort} onChange={set("imapPort")} />
          </Field>
          <Field label="Security">
            <SecuritySelect
              value={s.imapSec}
              onChange={(v) => setS((p) => ({ ...p, imapSec: v }))}
            />
          </Field>
        </div>
      </Card>
      <Card title="SMTP (outgoing)">
        <Field label="Server">
          <Input value={s.smtpHost} onChange={set("smtpHost")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port">
            <Input value={s.smtpPort} onChange={set("smtpPort")} />
          </Field>
          <Field label="Security">
            <SecuritySelect
              value={s.smtpSec}
              onChange={(v) => setS((p) => ({ ...p, smtpSec: v }))}
            />
          </Field>
        </div>
      </Card>
      <div className="flex justify-end">
        <PrimaryButton
          disabled={!dirty}
          onClick={() => toast("Mail server saved", { icon: <Check className="size-4" /> })}
        >
          Save changes
        </PrimaryButton>
      </div>
    </>
  );
}

/* ---------- Voice ---------- */

function VoicePanel() {
  const initial = {
    stun: "stun:stun.northlight.studio:3478",
    turn: "turn:turn.northlight.studio:3478?transport=udp",
    turnUser: "northlight",
    turnPwd: "",
    forceRelay: false,
  };
  const [s, setS] = useState(initial);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  return (
    <>
      <Card title="ICE servers">
        <Field label="STUN URLs">
          <Input value={s.stun} onChange={(e) => setS({ ...s, stun: e.target.value })} />
        </Field>
        <Field label="TURN URLs">
          <Input value={s.turn} onChange={(e) => setS({ ...s, turn: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="TURN username">
            <Input value={s.turnUser} onChange={(e) => setS({ ...s, turnUser: e.target.value })} />
          </Field>
          <Field label="TURN password">
            <Input
              type="password"
              value={s.turnPwd}
              onChange={(e) => setS({ ...s, turnPwd: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
        </div>
      </Card>
      <Card title="Routing">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: "#1a1a18" }}>
              Force TURN relay for all calls
            </div>
            <div
              className="text-xs"
              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
            >
              Routes every call through the TURN server. Off by default.
            </div>
          </div>
          <Switch checked={s.forceRelay} onCheckedChange={(v) => setS({ ...s, forceRelay: v })} />
        </div>
      </Card>
      <div className="flex justify-end">
        <PrimaryButton
          disabled={!dirty}
          onClick={() => toast("Voice settings saved", { icon: <Check className="size-4" /> })}
        >
          Save changes
        </PrimaryButton>
      </div>
    </>
  );
}

/* ---------- WebDAV ---------- */

function FeatureRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 border-t first:border-t-0"
      style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: "#1a1a18" }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}>
          {desc}
        </div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Stockholm",
  "Europe/Madrid",
  "Europe/Athens",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
];

function SecuritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = ["None", "STARTTLS", "SSL/TLS"];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function WebDAVPanel() {
  const initial = {
    tz: "Europe/Stockholm",
    realm: "Northlight",
    baseUri: "/dav",
    files: true,
    contacts: true,
    calendars: false,
  };
  const [s, setS] = useState(initial);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  return (
    <>
      <Card title="Server defaults">
        <Field label="Default timezone">
          <Select value={s.tz} onValueChange={(v) => setS({ ...s, tz: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Auth realm">
          <Input value={s.realm} onChange={(e) => setS({ ...s, realm: e.target.value })} />
        </Field>
        <Field label="Base URI">
          <Input value={s.baseUri} onChange={(e) => setS({ ...s, baseUri: e.target.value })} />
        </Field>
      </Card>
      <Card title="DAV features">
        <FeatureRow
          label="Files"
          desc="Expose user files via WebDAV."
          value={s.files}
          onChange={(v) => setS({ ...s, files: v })}
        />
        <FeatureRow
          label="Contacts"
          desc="Enable CardDAV for address books."
          value={s.contacts}
          onChange={(v) => setS({ ...s, contacts: v })}
        />
        <FeatureRow
          label="Calendars"
          desc="Enable CalDAV for calendars and tasks."
          value={s.calendars}
          onChange={(v) => setS({ ...s, calendars: v })}
        />
      </Card>
      <div className="flex justify-end">
        <PrimaryButton
          disabled={!dirty}
          onClick={() => toast("WebDAV settings saved", { icon: <Check className="size-4" /> })}
        >
          Save changes
        </PrimaryButton>
      </div>
    </>
  );
}

/* ---------- Backups ---------- */

type Backup = { id: string; filename: string; createdAt: string; version: string; size: string };

const SEED_BACKUPS: Backup[] = [
  {
    id: "b1",
    filename: "db-backup-2026-05-04.zip",
    createdAt: "2026-05-04 03:00",
    version: "v2.4.1",
    size: "184 MB",
  },
  {
    id: "b2",
    filename: "db-backup-2026-05-03.zip",
    createdAt: "2026-05-03 03:00",
    version: "v2.4.1",
    size: "182 MB",
  },
  {
    id: "b3",
    filename: "db-backup-2026-05-02.zip",
    createdAt: "2026-05-02 03:00",
    version: "v2.4.0",
    size: "181 MB",
  },
  {
    id: "b4",
    filename: "db-backup-2026-05-01.zip",
    createdAt: "2026-05-01 03:00",
    version: "v2.4.0",
    size: "180 MB",
  },
  {
    id: "b5",
    filename: "db-backup-2026-04-30.zip",
    createdAt: "2026-04-30 03:00",
    version: "v2.3.9",
    size: "179 MB",
  },
];

function BackupsPanel() {
  const [backups, setBackups] = useState<Backup[]>(SEED_BACKUPS);
  const [delBackup, setDelBackup] = useState<Backup | null>(null);
  const columns: DataTableColumn<Backup>[] = [
    {
      key: "file",
      header: "File",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3",
      render: (backup) => (
        <div className="flex items-center gap-2 min-w-0">
          <FileArchive className="size-4 shrink-0 opacity-60" />
          <span className="truncate font-medium">{backup.filename}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3 whitespace-nowrap",
      render: (backup) => (
        <span style={{ color: "color-mix(in oklab, #1a1a18 65%, transparent)" }}>
          {backup.createdAt}
        </span>
      ),
    },
    {
      key: "version",
      header: "Version",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3 whitespace-nowrap",
      render: (backup) => (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
          style={{
            backgroundColor: "color-mix(in oklab, #1a1a18 8%, transparent)",
            color: "#1a1a18",
          }}
        >
          {backup.version}
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3 whitespace-nowrap",
      render: (backup) => (
        <span style={{ color: "color-mix(in oklab, #1a1a18 65%, transparent)" }}>
          {backup.size}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "font-medium pb-3 w-1",
      cellClassName: "py-3 whitespace-nowrap",
      render: (backup) => (
        <div className="flex items-center gap-1 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Download ${backup.filename}`}
                onClick={() => toast("Download started", { icon: <Check className="size-4" /> })}
                className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
              >
                <Download className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Delete ${backup.filename}`}
                onClick={() => setDelBackup(backup)}
                className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
              >
                <Trash2 className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card title="Database backups">
        <DataTable
          data={backups}
          columns={columns}
          rowKey={(backup) => backup.id}
          className="-mx-6 px-6"
          tableClassName="text-sm"
          headerClassName="text-left text-[10px] uppercase tracking-[0.18em]"
          rowClassName="border-t hover:bg-transparent"
          rowStyle={() => ({ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" })}
        />
      </Card>

      <AlertDialog open={!!delBackup} onOpenChange={(o) => !o && setDelBackup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <span className="font-medium">{delBackup?.filename}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (delBackup) {
                  setBackups((arr) => arr.filter((x) => x.id !== delBackup.id));
                  toast("Backup deleted");
                }
                setDelBackup(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------- Updates ---------- */

type LogEntry = {
  id: string;
  time: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
};
type CheckStatus = "ok" | "warn" | "error" | "pending";
type ServerCheck = { id: string; label: string; status: CheckStatus; detail: string };

const SEED_LOG: LogEntry[] = [
  {
    id: "l1",
    time: "2026-05-05 09:14:02",
    level: "info",
    message: "Update channel set to 'stable'.",
  },
  {
    id: "l2",
    time: "2026-05-04 03:00:11",
    level: "success",
    message: "Updated to v2.4.1 successfully.",
  },
  {
    id: "l3",
    time: "2026-05-04 02:58:40",
    level: "info",
    message: "Pre-update backup created (db-backup-2026-05-04.zip).",
  },
  {
    id: "l4",
    time: "2026-05-01 12:42:09",
    level: "warn",
    message: "Background check skipped: maintenance window active.",
  },
  {
    id: "l5",
    time: "2026-04-28 08:01:33",
    level: "error",
    message: "Update v2.4.0-rc.2 rolled back: integrity check failed.",
  },
];

const SEED_CHECKS: ServerCheck[] = [
  { id: "c1", label: "Disk space", status: "ok", detail: "42.1 GB free of 100 GB" },
  { id: "c2", label: "Database connectivity", status: "ok", detail: "Responding in 4 ms" },
  { id: "c3", label: "Backup freshness", status: "ok", detail: "Last backup 6 hours ago" },
  {
    id: "c4",
    label: "Outbound network",
    status: "warn",
    detail: "High latency to update mirror (820 ms)",
  },
  { id: "c5", label: "Background workers", status: "ok", detail: "3 / 3 healthy" },
];

function StatusDot({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, { color: string; Icon: typeof CircleCheck }> = {
    ok: { color: "#3a8f5a", Icon: CircleCheck },
    warn: { color: "#c98a1f", Icon: CircleAlert },
    error: { color: "#b14242", Icon: CircleX },
    pending: {
      color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
      Icon: CircleDashed,
    },
  };
  const { color, Icon } = map[status];
  return <Icon className="size-4 shrink-0" style={{ color }} aria-hidden />;
}

function UpdatesPanel() {
  const LATEST = "v2.5.0";
  const [current, setCurrent] = useState("v2.4.1");
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(true);
  const [lastChecked, setLastChecked] = useState("2026-05-05 09:14");
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [log, setLog] = useState<LogEntry[]>(SEED_LOG);
  const [checks, setChecks] = useState<ServerCheck[]>(SEED_CHECKS);
  const [confirmClear, setConfirmClear] = useState(false);

  const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);
  const pushLog = (level: LogEntry["level"], message: string) =>
    setLog((arr) => [{ id: `l${Date.now()}`, time: stamp(), level, message }, ...arr]);

  const checkForUpdates = () => {
    setChecking(true);
    pushLog("info", "Checking for updates…");
    setTimeout(() => {
      setChecking(false);
      setLastChecked(stamp().slice(0, 16));
      setUpdateAvailable(true);
      pushLog("success", `Update available: ${LATEST}`);
      toast("Update available", { icon: <Check className="size-4" /> });
    }, 900);
  };

  const UPDATE_STEPS = [
    "Downloading",
    "Extracting",
    "Backing up database",
    "Applying update",
  ] as const;
  const [stepIndex, setStepIndex] = useState(-1);

  const runUpdate = () => {
    setConfirmUpdate(false);
    setUpdating(true);
    setStepIndex(0);
    pushLog("info", `Starting update to ${LATEST}…`);

    const durations = [900, 700, 800, 900];
    let cumulative = 0;
    UPDATE_STEPS.forEach((label, i) => {
      cumulative += durations[i];
      setTimeout(() => {
        pushLog("info", `${label} complete.`);
        if (i < UPDATE_STEPS.length - 1) {
          setStepIndex(i + 1);
        } else {
          setStepIndex(UPDATE_STEPS.length);
          setUpdating(false);
          setUpdateAvailable(false);
          setCurrent(LATEST);
          pushLog("success", `Updated to ${LATEST} successfully.`);
          toast("Update complete", { icon: <Check className="size-4" /> });
          setTimeout(() => setStepIndex(-1), 1500);
        }
      }, cumulative);
    });
  };

  const refreshChecks = () => {
    setChecks((arr) => arr.map((c) => ({ ...c, status: "pending" as CheckStatus })));
    setTimeout(() => setChecks(SEED_CHECKS), 700);
  };

  const levelColor = (lvl: LogEntry["level"]) =>
    lvl === "error"
      ? "#b14242"
      : lvl === "warn"
        ? "#c98a1f"
        : lvl === "success"
          ? "#3a8f5a"
          : "#1a1a18";
  const logColumns: DataTableColumn<LogEntry>[] = [
    {
      key: "time",
      header: "Time",
      headerClassName: "font-medium pb-2 pr-3",
      cellClassName: "py-2 pr-3 whitespace-nowrap tabular-nums",
      render: (entry) => (
        <span style={{ color: "color-mix(in oklab, #1a1a18 50%, transparent)" }}>{entry.time}</span>
      ),
    },
    {
      key: "level",
      header: "Level",
      headerClassName: "font-medium pb-2 pr-3",
      cellClassName: "py-2 pr-3 uppercase tracking-wider font-semibold whitespace-nowrap",
      render: (entry) => (
        <span
          style={{ color: levelColor(entry.level), minWidth: "3.5rem", display: "inline-block" }}
        >
          {entry.level}
        </span>
      ),
    },
    {
      key: "message",
      header: "Message",
      headerClassName: "font-medium pb-2",
      cellClassName: "py-2",
      render: (entry) => <span style={{ color: "#1a1a18" }}>{entry.message}</span>,
    },
  ];

  return (
    <>
      <Card title="Release status">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
            >
              Installed
            </div>
            <div className="text-2xl" style={{ fontFamily: "var(--font-serif)", color: "#1a1a18" }}>
              {current}
            </div>
          </div>
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
            >
              Latest
            </div>
            <div className="text-2xl" style={{ fontFamily: "var(--font-serif)", color: "#1a1a18" }}>
              {LATEST}
            </div>
          </div>
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
            >
              Channel
            </div>
            <div className="text-sm" style={{ color: "#1a1a18" }}>
              stable
            </div>
          </div>
          <div className="flex-1 min-w-32">
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
            >
              Last checked
            </div>
            <div className="text-sm" style={{ color: "#1a1a18" }}>
              {lastChecked}
            </div>
          </div>
        </div>

        <Callout
          className="mt-5"
          severity={updateAvailable ? "warning" : "success"}
          icon={
            updateAvailable ? undefined : (
              <PackageCheck className="size-4" style={{ color: "#3a8f5a" }} aria-hidden />
            )
          }
          title={updateAvailable ? "Update available" : "You're up to date"}
          message={
            updateAvailable
              ? `${LATEST} introduces faster sync and security patches.`
              : "Running the latest stable release."
          }
          subtitle={`Checked on ${lastChecked}`}
        />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={checkForUpdates} disabled={checking || updating}>
            <RefreshCw className={`size-4 mr-2 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check for updates"}
          </Button>
          <PrimaryButton
            onClick={() => setConfirmUpdate(true)}
            disabled={!updateAvailable || updating || checking}
          >
            {updating ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Download className="size-4 mr-2" />
            )}
            {updating ? "Updating…" : `Update to ${LATEST}`}
          </PrimaryButton>
        </div>

        {stepIndex >= 0 && (
          <div
            className="mt-5 rounded-lg border p-4 animate-fade-in"
            style={{
              backgroundColor: "color-mix(in oklab, #1a1a18 4%, transparent)",
              borderColor: "color-mix(in oklab, #1a1a18 12%, transparent)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
              >
                Update progress
              </div>
              <div
                className="text-xs tabular-nums"
                style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
              >
                {Math.min(stepIndex, UPDATE_STEPS.length)} / {UPDATE_STEPS.length}
              </div>
            </div>

            <div
              className="h-1.5 rounded-full overflow-hidden mb-4"
              style={{ backgroundColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
            >
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${(Math.min(stepIndex, UPDATE_STEPS.length) / UPDATE_STEPS.length) * 100}%`,
                  backgroundColor: ACCENT,
                }}
              />
            </div>

            <ol className="space-y-2">
              {UPDATE_STEPS.map((label, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span
                      className="size-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor: done
                          ? ACCENT
                          : active
                            ? "color-mix(in oklab, #1a1a18 12%, transparent)"
                            : "color-mix(in oklab, #1a1a18 6%, transparent)",
                        color: done ? "#ffffff" : "#1a1a18",
                      }}
                    >
                      {done ? (
                        <Check className="size-3" />
                      ) : active ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <span className="text-[10px] tabular-nums opacity-60">{i + 1}</span>
                      )}
                    </span>
                    <span
                      style={{
                        color:
                          done || active
                            ? "#1a1a18"
                            : "color-mix(in oklab, #1a1a18 50%, transparent)",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {label}
                      {active && <span className="opacity-60">…</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </Card>

      <Card
        title="Server checks"
        iconActions={[
          {
            label: "Re-run checks",
            icon: <RefreshCw className="size-4" />,
            onClick: refreshChecks,
          },
        ]}
      >
        <ul
          className="divide-y"
          style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
        >
          {checks.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <MenuItem
                tone="inherit"
                icon={<StatusDot status={c.status} />}
                label={c.label}
                description={c.status === "pending" ? "Checking…" : c.detail}
                className="w-full px-0 py-0 text-[#1a1a18] hover:bg-transparent focus-visible:ring-0"
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Update log"
        iconActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="size-4" />,
            onClick: () => pushLog("info", "Log refreshed."),
          },
          {
            label: "Clear",
            icon: <Eraser className="size-4" />,
            onClick: () => setConfirmClear(true),
          },
        ]}
      >
        {log.length === 0 ? (
          <p
            className="text-sm py-4"
            style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
          >
            No log entries.
          </p>
        ) : (
          <DataTable
            data={log}
            columns={logColumns}
            rowKey={(entry) => entry.id}
            tableClassName="font-mono text-xs"
            headerClassName="text-left text-[10px] uppercase tracking-[0.18em]"
            rowClassName="border-t hover:bg-transparent"
            rowStyle={() => ({ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" })}
          />
        )}
      </Card>

      <AlertDialog open={confirmUpdate} onOpenChange={setConfirmUpdate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update to {LATEST}?</AlertDialogTitle>
            <AlertDialogDescription>
              The server will create a pre-update backup and may restart. Active sessions could
              briefly disconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runUpdate}>Update now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear update log?</AlertDialogTitle>
            <AlertDialogDescription>
              All log entries will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLog([]);
                setConfirmClear(false);
                toast("Log cleared");
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

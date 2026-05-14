import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ServerCog,
  Database,
  Cloud,
  Mail as MailIcon,
  Phone,
  UserPlus,
  PartyPopper,
  CircleCheck,
  CircleAlert,
  CircleDashed,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  Lock,
} from "lucide-react";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/button/src/button";
import { Switch } from "@/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { SidebarGroup, SidebarLink } from "@/settings-sidebar/src/settings-sidebar";
import { AppSidebar, AppSidebarScrim } from "@/app-sidebar/src/app-sidebar";
import { AppSwitcher } from "@/app-switcher/src/app-switcher";
import {
  WorkspaceAppLayout,
  WorkspaceSidebarToggle,
} from "@/workspace-shell/src/workspace-app-layout";
import {
  fetchInstallerBootstrap,
  installerDatabaseNext,
  installerDatabaseTest,
  installerInstall,
  installerRequirementsCheck,
  installerRequirementsNext,
  installerSiteNext,
  installerWelcomeNext,
  type InstallerDatabasePayload,
  type InstallerInstallPayload,
  type InstallerSitePayload,
} from "@/lib/api/wgw/installer";
import type { WgwInstallerActionResponse, WgwInstallerRuntimeState } from "@/lib/api/wgw";

export const Route = createFileRoute("/install")({
  component: InstallApp,
  head: () => ({
    meta: [
      { title: "Install" },
      { name: "description", content: "Set up your server." },
      { name: "theme-color", content: "#2f302c" },
    ],
  }),
});

export function InstallApp() {
  return <InstallWorkspace />;
}

const ACCENT = "#23b572";
const ACCENT_DEEP = "#23b572";
const INK = "#1a1a18";

type StepId = "welcome" | "server" | "database" | "dav" | "mail" | "meet" | "admin" | "done";
type InstallerBackendStep =
  | "welcome"
  | "requirements"
  | "database"
  | "site"
  | "account"
  | "done"
  | "installed";
type CheckStatus = "ok" | "warn" | "error" | "pending";
type ServerCheck = { id: string; label: string; status: CheckStatus; detail: string };

const STEPS: { id: StepId; label: string; icon: ReactNode }[] = [
  { id: "welcome", label: "Welcome", icon: <Sparkles className="size-3.5" /> },
  { id: "server", label: "Server check", icon: <ServerCog className="size-3.5" /> },
  { id: "database", label: "Database", icon: <Database className="size-3.5" /> },
  { id: "dav", label: "Files, Contacts & Calendars", icon: <Cloud className="size-3.5" /> },
  { id: "mail", label: "Mail server", icon: <MailIcon className="size-3.5" /> },
  { id: "meet", label: "Meet", icon: <Phone className="size-3.5" /> },
  { id: "admin", label: "Admin account", icon: <UserPlus className="size-3.5" /> },
  { id: "done", label: "Done", icon: <PartyPopper className="size-3.5" /> },
];

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Stockholm",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
];

function backendStepToUiStep(step: InstallerBackendStep): StepId {
  switch (step) {
    case "requirements":
      return "server";
    case "database":
      return "database";
    case "site":
      return "dav";
    case "account":
      return "admin";
    case "done":
      return "done";
    case "installed":
      return "done";
    default:
      return "welcome";
  }
}

function stepIndex(step: StepId): number {
  return Math.max(
    0,
    STEPS.findIndex((candidate) => candidate.id === step),
  );
}

function toServerChecks(state: WgwInstallerRuntimeState | null): ServerCheck[] {
  const rows = state?.checks ?? [];
  return rows.map((row, index) => ({
    id: String(index),
    label: row.label,
    status: row.ok ? "ok" : "error",
    detail: row.detail,
  }));
}

function StatusDot({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, { color: string; Icon: typeof CircleCheck }> = {
    ok: { color: "#3a8f5a", Icon: CircleCheck },
    warn: { color: "#c98a1f", Icon: CircleAlert },
    error: { color: "#b14242", Icon: CircleAlert },
    pending: { color: "#7a7a78", Icon: CircleDashed },
  };
  const { color, Icon } = map[status];
  return <Icon className="size-4 shrink-0" style={{ color }} aria-hidden />;
}

function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-xl border p-6 mb-6"
      style={{
        backgroundColor: "color-mix(in oklab, #1a1a18 3%, transparent)",
        borderColor: "color-mix(in oklab, #1a1a18 12%, transparent)",
      }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2
              className="text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
            >
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  readOnly,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-3 mb-7 last:mb-0">
      <Label
        className="text-xs uppercase tracking-wider font-medium flex items-center gap-1.5"
        style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}
      >
        {label}
        {readOnly && <Lock className="size-3 opacity-60" aria-hidden />}
      </Label>
      {children}
      {hint && (
        <p className="text-xs" style={{ color: "color-mix(in oklab, #1a1a18 50%, transparent)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function PrimaryButton(props: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      style={{ backgroundColor: ACCENT, color: "#ffffff", ...(props.style || {}) }}
    />
  );
}

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
        <div className="text-sm font-medium" style={{ color: INK }}>
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

function SecuritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = ["none", "starttls", "ssl"];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item} value={item}>
            {item.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PasswordInput({
  value,
  onChange,
  visible,
  onToggleVisible,
  placeholder = "********",
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_10%,transparent)]"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

type InstallWorkspaceProps = {
  bootstrapState?: WgwInstallerRuntimeState | null;
};

export function InstallWorkspace({ bootstrapState = null }: InstallWorkspaceProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [loadingBootstrap, setLoadingBootstrap] = useState(bootstrapState === null);
  const [actionPending, setActionPending] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [installerState, setInstallerState] = useState<WgwInstallerRuntimeState | null>(
    bootstrapState,
  );

  const [dbType, setDbType] = useState<"sqlite" | "mysql">("sqlite");
  const [sqlitePath, setSqlitePath] = useState("wgw-content/db.sqlite");
  const [mysql, setMysql] = useState({
    host: "127.0.0.1",
    port: "3306",
    database: "wgw",
    username: "wgw",
    password: "",
  });
  const [dav, setDav] = useState({ files: true, contacts: true, calendars: true });
  const [mail, setMail] = useState({
    enabled: false,
    imapHost: "",
    imapPort: "993",
    imapSec: "ssl",
    smtpHost: "",
    smtpPort: "587",
    smtpSec: "starttls",
  });
  const [meet, setMeet] = useState({
    turn: "",
    turnUser: "",
    turnPwd: "",
    tz: "UTC",
  });
  const [admin, setAdmin] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    password2: "",
  });
  const [mysqlTest, setMysqlTest] = useState<{
    state: "idle" | "testing" | "ok" | "error";
    message?: string;
  }>({
    state: "idle",
  });
  const [showChecks, setShowChecks] = useState(false);
  const [showMysqlPassword, setShowMysqlPassword] = useState(false);
  const [showTurnPassword, setShowTurnPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAdminPassword2, setShowAdminPassword2] = useState(false);

  const step = STEPS[stepIdx]!;
  const checks = useMemo(() => toServerChecks(installerState), [installerState]);
  const checkSummary = useMemo(() => {
    const total = checks.length;
    const passCount = checks.filter((check) => check.status === "ok").length;
    const issueCount = checks.filter((check) => check.status !== "ok").length;
    if (total === 0) return "No checks available yet.";
    if (issueCount === 0) return `${total} checks passed`;
    return `${passCount}/${total} checks passed, ${issueCount} need attention`;
  }, [checks]);
  const alreadyInstalled = installerState?.already_installed === true;
  const adminUpdatesUrl = installerState?.admin_updates_url ?? "/admin/updates";

  const hydrateFromState = (state: WgwInstallerRuntimeState) => {
    setInstallerState(state);
    setDbType(state.db_driver);
    setSqlitePath(state.db.sqlite_path ?? "wgw-content/db.sqlite");
    setMysql((current) => ({
      ...current,
      host: state.db.mysql_host ?? current.host,
      port: String(state.db.mysql_port ?? Number(current.port || "3306")),
      database: state.db.mysql_db ?? current.database,
      username: state.db.mysql_user ?? current.username,
    }));
    setDav({
      files: !!state.enable_files,
      calendars: !!state.enable_calendars,
      contacts: !!state.enable_contacts,
    });
    setMeet((current) => ({ ...current, tz: state.timezone || current.tz }));
  };

  const setUiStep = (nextStep: StepId) => {
    setStepIdx(stepIndex(nextStep));
  };

  const setStepFromBackend = (state: WgwInstallerRuntimeState, fallback?: StepId) => {
    const mapped = backendStepToUiStep(state.step as InstallerBackendStep);
    setUiStep(fallback ?? mapped);
  };

  const loadBootstrap = useCallback(async () => {
    setLoadingBootstrap(true);
    setBootstrapError(null);
    try {
      const bootstrap = await fetchInstallerBootstrap();
      const state = bootstrap.state;
      setInstallerState(state);
      setDbType(state.db_driver);
      setSqlitePath(state.db.sqlite_path ?? "wgw-content/db.sqlite");
      setMysql((current) => ({
        ...current,
        host: state.db.mysql_host ?? current.host,
        port: String(state.db.mysql_port ?? Number(current.port || "3306")),
        database: state.db.mysql_db ?? current.database,
        username: state.db.mysql_user ?? current.username,
      }));
      setDav({
        files: !!state.enable_files,
        calendars: !!state.enable_calendars,
        contacts: !!state.enable_contacts,
      });
      setMeet((current) => ({ ...current, tz: state.timezone || current.tz }));
      setStepIdx(stepIndex(backendStepToUiStep(state.step as InstallerBackendStep)));
      if (state.flash) toast(state.flash);
    } catch (error) {
      setBootstrapError(error instanceof Error ? error.message : "Failed to load installer state.");
    } finally {
      setLoadingBootstrap(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrapState) {
      hydrateFromState(bootstrapState);
      setStepIdx(stepIndex(backendStepToUiStep(bootstrapState.step as InstallerBackendStep)));
      setLoadingBootstrap(false);
      setBootstrapError(null);
      return;
    }
    void loadBootstrap();
  }, [bootstrapState, loadBootstrap]);

  const withPending = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setActionPending(true);
    try {
      return await fn();
    } finally {
      setActionPending(false);
    }
  };

  const syncAction = (response: WgwInstallerActionResponse) => {
    if (response.state) {
      hydrateFromState(response.state);
    }
    if (!response.ok) {
      throw new Error(response.error || response.state?.flash || "Installer action failed.");
    }
    if (response.state?.flash) {
      toast(response.state.flash);
    }
    return response;
  };

  const buildDatabasePayload = (): InstallerDatabasePayload => ({
    db_driver: dbType,
    sqlite_path: sqlitePath,
    mysql_host: mysql.host,
    mysql_port: Number(mysql.port || 3306),
    mysql_db: mysql.database,
    mysql_user: mysql.username,
    mysql_password: mysql.password,
  });

  const testDatabaseConnection = async (): Promise<boolean> => {
    setMysqlTest({ state: "testing" });
    try {
      const response = syncAction(await installerDatabaseTest(buildDatabasePayload()));
      if (!response.ok) {
        setMysqlTest({ state: "error", message: response.error || "Connection failed." });
        return false;
      }
      setMysqlTest({
        state: "ok",
        message: `Connected to ${mysql.database}@${mysql.host}:${mysql.port}`,
      });
      return true;
    } catch (error) {
      setMysqlTest({
        state: "error",
        message: error instanceof Error ? error.message : "Connection failed.",
      });
      return false;
    }
  };

  const canNext = (() => {
    switch (step.id) {
      case "database":
        return dbType === "sqlite"
          ? sqlitePath.trim().length > 0
          : mysql.host.trim() &&
              mysql.database.trim() &&
              mysql.username.trim() &&
              mysqlTest.state !== "testing";
      case "admin":
        return (
          admin.username.trim() &&
          admin.displayName.trim() &&
          /.+@.+\..+/.test(admin.email) &&
          admin.password.length >= 10 &&
          admin.password === admin.password2
        );
      default:
        return true;
    }
  })();

  const goNext = async () => {
    if (!canNext || actionPending) return;
    try {
      await withPending(async () => {
        if (step.id === "welcome") {
          const response = syncAction(await installerWelcomeNext());
          if (response.state) setStepFromBackend(response.state);
          return;
        }
        if (step.id === "server") {
          const response = syncAction(await installerRequirementsNext({ db_driver: dbType }));
          if (response.state) setStepFromBackend(response.state);
          return;
        }
        if (step.id === "database") {
          if (dbType === "mysql" && mysqlTest.state !== "ok") {
            const ok = await testDatabaseConnection();
            if (!ok) return;
          }
          const response = syncAction(await installerDatabaseNext(buildDatabasePayload()));
          if (response.state) setStepFromBackend(response.state);
          return;
        }
        if (step.id === "dav") {
          const payload: InstallerSitePayload = {
            base_uri_override: "",
            timezone: meet.tz,
            enable_files: dav.files,
            enable_calendars: dav.calendars,
            enable_contacts: dav.contacts,
            show_browser_ui: true,
          };
          syncAction(await installerSiteNext(payload));
          setUiStep("mail");
          return;
        }
        if (step.id === "mail") {
          setUiStep("meet");
          return;
        }
        if (step.id === "meet") {
          setUiStep("admin");
          return;
        }
        if (step.id === "admin") {
          const payload: InstallerInstallPayload = {
            username: admin.username,
            display_name: admin.displayName,
            email: admin.email,
            password: admin.password,
            password_confirm: admin.password2,
            mail_enabled: mail.enabled,
            mail_imap_host: mail.imapHost,
            mail_imap_port: mail.imapPort,
            mail_imap_security: mail.imapSec,
            mail_smtp_host: mail.smtpHost,
            mail_smtp_port: mail.smtpPort,
            mail_smtp_security: mail.smtpSec,
            voice_enabled: meet.turn.trim().length > 0,
            voice_turn_url: meet.turn,
            voice_turn_username: meet.turnUser,
            voice_turn_credential: meet.turnPwd,
          };
          const response = syncAction(await installerInstall(payload));
          if (response.redirect && typeof window !== "undefined") {
            window.location.assign(response.redirect);
            return;
          }
          if (response.state) setStepFromBackend(response.state);
          toast("Installation complete", { icon: <Check className="size-4" /> });
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  };

  const goBack = () => {
    if (actionPending) return;
    setStepIdx((current) => Math.max(current - 1, 0));
  };

  const goToStep = (index: number) => {
    setStepIdx(index);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

  if (loadingBootstrap) {
    return (
      <WorkspaceAppLayout className="notes-root">
        <section className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}>
            Loading installer...
          </p>
        </section>
      </WorkspaceAppLayout>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <WorkspaceAppLayout
        className="notes-root"
        style={{
          ["--workspace-root-bg" as string]: "var(--color-cream, #f5f1e8)",
          ["--app-sidebar-bg" as string]: ACCENT_DEEP,
          ["--app-sidebar-color" as string]: "#042318",
          ["--workspace-sidebar-toggle-color" as string]: INK,
          ["--workspace-sidebar-toggle-bg" as string]:
            "color-mix(in oklab, #1a1a18 6%, transparent)",
        }}
      >
        <AppSidebar
          open={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          showAppSwitcher
          appSwitcher={<AppSwitcher tagline="We got" subtitle="Workspace" items={[]} disabled />}
          closeButtonHoverClassName="hover:bg-[color-mix(in_oklab,#042318_12%,transparent)]"
        >
          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <SidebarGroup label="Setup steps">
              {STEPS.map((candidate, index) => {
                const done = index < stepIdx;
                const active = index === stepIdx;
                const reachable = index <= stepIdx;
                return (
                  <SidebarLink
                    key={candidate.id}
                    active={active}
                    onClick={reachable ? () => goToStep(index) : undefined}
                    icon={
                      <span
                        className="size-5 rounded-full flex items-center justify-center text-[10px] tabular-nums"
                        style={{
                          backgroundColor: done
                            ? "#042318"
                            : active
                              ? "color-mix(in oklab, #042318 22%, transparent)"
                              : "color-mix(in oklab, #042318 10%, transparent)",
                          color: done ? ACCENT_DEEP : "#042318",
                          fontWeight: 600,
                        }}
                      >
                        {done ? <Check className="size-3" /> : index + 1}
                      </span>
                    }
                  >
                    <span style={{ opacity: reachable ? 1 : 0.5 }}>{candidate.label}</span>
                  </SidebarLink>
                );
              })}
            </SidebarGroup>
          </nav>
          <div
            className="p-4 md:p-6 text-xs shrink-0 border-t"
            style={{
              borderColor: "color-mix(in oklab, #042318 22%, transparent)",
              color: "color-mix(in oklab, #042318 75%, transparent)",
            }}
          >
            Step {stepIdx + 1} of {STEPS.length}
          </div>
        </AppSidebar>
        <AppSidebarScrim open={sidebarOpen} onClick={() => setSidebarOpen(false)} />

        <section
          className="flex-1 flex flex-col min-w-0 relative"
          style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
        >
          <header
            className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b shrink-0"
            style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
          >
            <div className="flex items-center gap-3">
              <WorkspaceSidebarToggle
                open={sidebarOpen}
                onToggle={() => setSidebarOpen((value) => !value)}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] uppercase tracking-[0.2em] mb-1"
                  style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
                >
                  Step {stepIdx + 1} / {STEPS.length} - {step.label}
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
                >
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((stepIdx + 1) / STEPS.length) * 100}%`,
                      backgroundColor: ACCENT,
                    }}
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 md:px-12 py-10 md:py-16">
              <div className="mb-8">
                <div
                  className="text-[10px] uppercase tracking-[0.22em] mb-2 flex items-center gap-2"
                  style={{
                    color: "color-mix(in oklab, #1a1a18 55%, transparent)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {step.icon}
                  {step.label}
                </div>
                <h1
                  className="text-3xl md:text-4xl leading-tight"
                  style={{ fontFamily: "var(--font-serif)", color: INK }}
                >
                  {stepTitle(step.id)}
                </h1>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}
                >
                  {stepSubtitle(step.id)}
                </p>
              </div>

              {bootstrapError && (
                <Card title="Could not load installer">
                  <p className="text-sm" style={{ color: "#b14242" }}>
                    {bootstrapError}
                  </p>
                  <div className="mt-4">
                    <PrimaryButton onClick={() => void loadBootstrap()}>Retry</PrimaryButton>
                  </div>
                </Card>
              )}

              {!alreadyInstalled && step.id === "welcome" && <WelcomeStep />}

              {!alreadyInstalled && step.id === "server" && (
                <Card
                  title="System checks"
                  action={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Re-run checks"
                          onClick={() =>
                            void withPending(async () => {
                              const response = syncAction(
                                await installerRequirementsCheck({ db_driver: dbType }),
                              );
                              if (response.state) setStepFromBackend(response.state, "server");
                              toast("Server checks refreshed", {
                                icon: <Check className="size-4" />,
                              });
                            })
                          }
                          disabled={actionPending}
                          className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                        >
                          <RefreshCw className={`size-4 ${actionPending ? "animate-spin" : ""}`} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Re-run checks</TooltipContent>
                    </Tooltip>
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="text-sm"
                      style={{ color: "color-mix(in oklab, #1a1a18 65%, transparent)" }}
                    >
                      {checkSummary}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => setShowChecks((value) => !value)}
                    >
                      {showChecks ? "Hide checks" : "Show checks"}
                    </Button>
                  </div>
                  {showChecks && (
                    <ul
                      className="divide-y mt-3"
                      style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
                    >
                      {checks.map((check) => (
                        <li
                          key={check.id}
                          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <StatusDot status={check.status} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium" style={{ color: INK }}>
                              {check.label}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
                            >
                              {check.detail}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {!alreadyInstalled && step.id === "database" && (
                <>
                  <Card title="Database type">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["sqlite", "mysql"] as const).map((candidate) => {
                        const active = dbType === candidate;
                        return (
                          <button
                            key={candidate}
                            type="button"
                            onClick={() => {
                              setDbType(candidate);
                              setMysqlTest({ state: "idle" });
                            }}
                            className="rounded-lg border p-4 text-left transition-colors"
                            style={{
                              borderColor: active
                                ? ACCENT
                                : "color-mix(in oklab, #1a1a18 12%, transparent)",
                              backgroundColor: active
                                ? "color-mix(in oklab, #2f302c 8%, transparent)"
                                : "transparent",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Database className="size-4" style={{ color: INK }} />
                              <div className="text-sm font-medium" style={{ color: INK }}>
                                {candidate === "sqlite" ? "SQLite" : "MySQL / MariaDB"}
                              </div>
                              {active && (
                                <Check className="size-4 ml-auto" style={{ color: ACCENT }} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  {dbType === "sqlite" ? (
                    <Card title="SQLite settings">
                      <Field label="Database file" hint="Path is relative to the install root.">
                        <Input
                          value={sqlitePath}
                          onChange={(event) => setSqlitePath(event.target.value)}
                          placeholder="wgw-content/db.sqlite"
                        />
                      </Field>
                    </Card>
                  ) : (
                    <Card title="MySQL credentials">
                      <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <Field label="Host">
                              <Input
                                value={mysql.host}
                                onChange={(event) =>
                                  setMysql((current) => ({ ...current, host: event.target.value }))
                                }
                              />
                            </Field>
                          </div>
                          <Field label="Port">
                            <Input
                              value={mysql.port}
                              onChange={(event) =>
                                setMysql((current) => ({ ...current, port: event.target.value }))
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Database name">
                          <Input
                            value={mysql.database}
                            onChange={(event) =>
                              setMysql((current) => ({ ...current, database: event.target.value }))
                            }
                          />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Username">
                            <Input
                              value={mysql.username}
                              onChange={(event) =>
                                setMysql((current) => ({
                                  ...current,
                                  username: event.target.value,
                                }))
                              }
                            />
                          </Field>
                          <Field label="Password">
                            <PasswordInput
                              value={mysql.password}
                              visible={showMysqlPassword}
                              onToggleVisible={() => setShowMysqlPassword((value) => !value)}
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setMysql((current) => ({
                                  ...current,
                                  password: event.target.value,
                                }))
                              }
                            />
                          </Field>
                        </div>
                      </div>
                      {mysqlTest.state === "error" && (
                        <p className="text-xs mt-3" style={{ color: "#b14242" }}>
                          {mysqlTest.message || "Connection failed."}
                        </p>
                      )}
                      {mysqlTest.state === "ok" && (
                        <p className="text-xs mt-3" style={{ color: "#3a8f5a" }}>
                          {mysqlTest.message || "Connection verified."}
                        </p>
                      )}
                    </Card>
                  )}
                </>
              )}

              {!alreadyInstalled && step.id === "dav" && (
                <>
                  <Card title="Files, Contacts & Calendars">
                    <FeatureRow
                      label="Files"
                      desc="Sync user files across devices."
                      value={dav.files}
                      onChange={(value) => setDav((current) => ({ ...current, files: value }))}
                    />
                    <FeatureRow
                      label="Contacts"
                      desc="Sync address books across devices."
                      value={dav.contacts}
                      onChange={(value) => setDav((current) => ({ ...current, contacts: value }))}
                    />
                    <FeatureRow
                      label="Calendars"
                      desc="Sync calendars and tasks across devices."
                      value={dav.calendars}
                      onChange={(value) => setDav((current) => ({ ...current, calendars: value }))}
                    />
                  </Card>
                  <Card title="Regional">
                    <Field label="Default timezone">
                      <Select
                        value={meet.tz}
                        onValueChange={(value) => setMeet((current) => ({ ...current, tz: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {TIMEZONES.map((timezone) => (
                            <SelectItem key={timezone} value={timezone}>
                              {timezone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </Card>
                </>
              )}

              {!alreadyInstalled && step.id === "mail" && (
                <>
                  <Card title="Mail feature">
                    <FeatureRow
                      label="Enable webmail"
                      desc="Configure server defaults now, user accounts later."
                      value={mail.enabled}
                      onChange={(value) => setMail((current) => ({ ...current, enabled: value }))}
                    />
                  </Card>
                  {mail.enabled && (
                    <>
                      <Card title="IMAP (incoming)">
                        <Field label="Server">
                          <Input
                            value={mail.imapHost}
                            onChange={(event) =>
                              setMail((current) => ({ ...current, imapHost: event.target.value }))
                            }
                            placeholder="imap.example.com"
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Port">
                            <Input
                              value={mail.imapPort}
                              onChange={(event) =>
                                setMail((current) => ({ ...current, imapPort: event.target.value }))
                              }
                            />
                          </Field>
                          <Field label="Security">
                            <SecuritySelect
                              value={mail.imapSec}
                              onChange={(value) =>
                                setMail((current) => ({ ...current, imapSec: value }))
                              }
                            />
                          </Field>
                        </div>
                      </Card>
                      <Card title="SMTP (outgoing)">
                        <Field label="Server">
                          <Input
                            value={mail.smtpHost}
                            onChange={(event) =>
                              setMail((current) => ({ ...current, smtpHost: event.target.value }))
                            }
                            placeholder="smtp.example.com"
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Port">
                            <Input
                              value={mail.smtpPort}
                              onChange={(event) =>
                                setMail((current) => ({ ...current, smtpPort: event.target.value }))
                              }
                            />
                          </Field>
                          <Field label="Security">
                            <SecuritySelect
                              value={mail.smtpSec}
                              onChange={(value) =>
                                setMail((current) => ({ ...current, smtpSec: value }))
                              }
                            />
                          </Field>
                        </div>
                      </Card>
                    </>
                  )}
                </>
              )}

              {!alreadyInstalled && step.id === "meet" && (
                <Card title="TURN server">
                  <Field label="TURN URL">
                    <Input
                      value={meet.turn}
                      onChange={(event) =>
                        setMeet((current) => ({ ...current, turn: event.target.value }))
                      }
                      placeholder="turn:turn.example.com:3478"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="TURN username">
                      <Input
                        value={meet.turnUser}
                        onChange={(event) =>
                          setMeet((current) => ({ ...current, turnUser: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="TURN password">
                      <PasswordInput
                        value={meet.turnPwd}
                        visible={showTurnPassword}
                        onToggleVisible={() => setShowTurnPassword((value) => !value)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          setMeet((current) => ({ ...current, turnPwd: event.target.value }))
                        }
                      />
                    </Field>
                  </div>
                </Card>
              )}

              {!alreadyInstalled && step.id === "admin" && (
                <Card title="Administrator account">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Username">
                      <Input
                        value={admin.username}
                        onChange={(event) =>
                          setAdmin((current) => ({ ...current, username: event.target.value }))
                        }
                        placeholder="admin"
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Display name">
                      <Input
                        value={admin.displayName}
                        onChange={(event) =>
                          setAdmin((current) => ({ ...current, displayName: event.target.value }))
                        }
                        placeholder="Jane Doe"
                      />
                    </Field>
                  </div>
                  <Field label="Email address">
                    <Input
                      type="email"
                      value={admin.email}
                      onChange={(event) =>
                        setAdmin((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="admin@example.com"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Password" hint="At least 10 characters.">
                      <PasswordInput
                        value={admin.password}
                        visible={showAdminPassword}
                        onToggleVisible={() => setShowAdminPassword((value) => !value)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          setAdmin((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Confirm password">
                      <PasswordInput
                        value={admin.password2}
                        visible={showAdminPassword2}
                        onToggleVisible={() => setShowAdminPassword2((value) => !value)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          setAdmin((current) => ({ ...current, password2: event.target.value }))
                        }
                      />
                    </Field>
                  </div>
                </Card>
              )}

              {step.id === "done" && (
                <Card>
                  <div className="flex flex-col items-center text-center py-6">
                    <div
                      className="size-16 rounded-full flex items-center justify-center mb-5"
                      style={{ backgroundColor: "color-mix(in oklab, #3a8f5a 18%, transparent)" }}
                    >
                      <PartyPopper className="size-8" style={{ color: "#3a8f5a" }} />
                    </div>
                    <h2
                      className="text-2xl mb-2"
                      style={{ fontFamily: "var(--font-serif)", color: INK }}
                    >
                      You're all set
                    </h2>
                    <p
                      className="text-sm max-w-md mb-6"
                      style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}
                    >
                      Your server has been configured. Continue to the admin panel.
                    </p>
                    <PrimaryButton
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.location.assign("/login?return=%2Fadmin%2F");
                          return;
                        }
                        navigate({ to: "/login", search: { return: "/admin/" } });
                      }}
                    >
                      Open admin panel
                      <ChevronRight className="size-4 ml-1" />
                    </PrimaryButton>
                  </div>
                </Card>
              )}

              {!alreadyInstalled && step.id !== "done" && (
                <div className="flex items-center justify-between mt-8">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    disabled={stepIdx === 0 || actionPending}
                    style={{ color: INK }}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Back
                  </Button>
                  <div className="flex items-center gap-2">
                    {(step.id === "mail" || step.id === "meet") && (
                      <Button
                        variant="ghost"
                        onClick={() => setUiStep(step.id === "mail" ? "meet" : "admin")}
                        disabled={actionPending}
                        style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}
                      >
                        Skip for now
                      </Button>
                    )}
                    <PrimaryButton
                      onClick={() => void goNext()}
                      disabled={!canNext || actionPending || mysqlTest.state === "testing"}
                    >
                      {actionPending || mysqlTest.state === "testing" ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Working...
                        </>
                      ) : step.id === "admin" ? (
                        <>
                          Finish install
                          <Check className="size-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Continue
                          <ChevronRight className="size-4 ml-1" />
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </WorkspaceAppLayout>
    </TooltipProvider>
  );
}

function stepTitle(id: StepId) {
  switch (id) {
    case "welcome":
      return "Welcome";
    case "server":
      return "Check your server";
    case "database":
      return "Pick a database";
    case "dav":
      return "Enable Files, Contacts & Calendars";
    case "mail":
      return "Mail server";
    case "meet":
      return "Meet & voice";
    case "admin":
      return "Create admin account";
    case "done":
      return "All done!";
  }
}

function stepSubtitle(id: StepId) {
  switch (id) {
    case "welcome":
      return "A short, guided setup. Takes about a minute.";
    case "server":
      return "Make sure your environment meets the requirements.";
    case "database":
      return "Choose where your data will live.";
    case "dav":
      return "Toggle the sync features you want to enable.";
    case "mail":
      return "Server addresses only - accounts are configured per user later.";
    case "meet":
      return "TURN settings used for voice and video calls.";
    case "admin":
      return "This account can manage everything in the server panel.";
    case "done":
      return "Your server is ready to go.";
  }
}

function WelcomeStep() {
  const items = [
    { label: "Server check", icon: <ServerCog className="size-4" /> },
    { label: "Database", icon: <Database className="size-4" /> },
    { label: "Files, Contacts & Calendars", icon: <Cloud className="size-4" /> },
    { label: "Mail server", icon: <MailIcon className="size-4" /> },
    { label: "Meet & voice", icon: <Phone className="size-4" /> },
    { label: "Admin account", icon: <UserPlus className="size-4" /> },
  ];
  return (
    <Card title="What you'll set up">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 rounded-md px-3 py-2.5"
            style={{ backgroundColor: "color-mix(in oklab, #1a1a18 4%, transparent)" }}
          >
            <span
              className="size-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: ACCENT, color: "#fff" }}
            >
              {item.icon}
            </span>
            <span className="text-sm font-medium" style={{ color: INK }}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

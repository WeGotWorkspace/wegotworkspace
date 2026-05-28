import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import type {
  InstallerDatabasePayload,
  InstallerInstallPayload,
  InstallerSitePayload,
} from "@/lib/api/wgw/installer";
import type { WgwInstallerActionResponse, WgwInstallerRuntimeState } from "@/lib/api/wgw";
import { wgwInstallOperations } from "@/install-core/src/install-wgw-operations";
import type { InstallWorkspaceProps } from "@/install-core/src/install-workspace-props";
import {
  INSTALL_STEPS,
  installBackendStepToUiStep,
  installStepIndex,
  toInstallServerChecks,
} from "@/install-core/src/install-models";
import { DEFAULT_PUBLIC_STUN_URLS_CSV } from "@/lib/rtc/default-stun";
import type {
  InstallAdminForm,
  InstallDavForm,
  InstallMailForm,
  InstallMeetForm,
  InstallMysqlForm,
  InstallMysqlTestState,
  InstallStepId,
  InstallerBackendStep,
} from "@/install-core/src/install-types";

export function useInstallController({
  data,
  onInstallRedirect,
  operations: operationsProp,
}: Pick<InstallWorkspaceProps, "data" | "onInstallRedirect" | "operations">) {
  const operations = operationsProp ?? wgwInstallOperations;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [actionPending, setActionPending] = useState(false);
  const [installerState, setInstallerState] = useState<WgwInstallerRuntimeState | null>(data.state);

  const [dbType, setDbType] = useState<"sqlite" | "mysql">("sqlite");
  const [sqlitePath, setSqlitePath] = useState("wgw-content/db.sqlite");
  const [mysql, setMysql] = useState<InstallMysqlForm>({
    host: "127.0.0.1",
    port: "3306",
    database: "wgw",
    username: "wgw",
    password: "",
  });
  const [dav, setDav] = useState<InstallDavForm>({ files: true, contacts: true, calendars: true });
  const [mail, setMail] = useState<InstallMailForm>({
    enabled: false,
    imapHost: "",
    imapPort: "993",
    imapSec: "ssl",
    smtpHost: "",
    smtpPort: "587",
    smtpSec: "starttls",
  });
  const [meet, setMeet] = useState<InstallMeetForm>({
    enabled: false,
    stun: DEFAULT_PUBLIC_STUN_URLS_CSV,
    turn: "",
    turnUser: "",
    turnPwd: "",
  });
  const [admin, setAdmin] = useState<InstallAdminForm>({
    username: "",
    displayName: "",
    email: "",
    password: "",
    password2: "",
  });
  const [mysqlTest, setMysqlTest] = useState<InstallMysqlTestState>({ state: "idle" });
  const [showChecks, setShowChecks] = useState(false);

  const step = INSTALL_STEPS[stepIdx]!;
  const checks = useMemo(() => toInstallServerChecks(installerState), [installerState]);
  const checkSummary = useMemo(() => {
    const total = checks.length;
    const passCount = checks.filter((check) => check.status === "ok").length;
    const issueCount = checks.filter((check) => check.status !== "ok").length;
    if (total === 0) return "No checks available yet.";
    if (issueCount === 0) return `${total} checks passed`;
    return `${passCount}/${total} checks passed, ${issueCount} need attention`;
  }, [checks]);
  const alreadyInstalled = installerState?.already_installed === true;

  const hydrateFromState = useCallback((state: WgwInstallerRuntimeState) => {
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
  }, []);

  useEffect(() => {
    if (!data.state) return;
    hydrateFromState(data.state);
    setStepIdx(
      installStepIndex(installBackendStepToUiStep(data.state.step as InstallerBackendStep)),
    );
    if (data.state.flash) toast(data.state.flash);
  }, [data.state, hydrateFromState]);

  const setUiStep = useCallback((nextStep: InstallStepId) => {
    setStepIdx(installStepIndex(nextStep));
  }, []);

  const setStepFromBackend = useCallback(
    (state: WgwInstallerRuntimeState, fallback?: InstallStepId) => {
      const mapped = installBackendStepToUiStep(state.step as InstallerBackendStep);
      setUiStep(fallback ?? mapped);
    },
    [setUiStep],
  );

  const withPending = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setActionPending(true);
    try {
      return await fn();
    } finally {
      setActionPending(false);
    }
  }, []);

  const syncAction = useCallback(
    (response: WgwInstallerActionResponse) => {
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
    },
    [hydrateFromState],
  );

  const buildDatabasePayload = useCallback(
    (): InstallerDatabasePayload => ({
      db_driver: dbType,
      sqlite_path: sqlitePath,
      mysql_host: mysql.host,
      mysql_port: Number(mysql.port || 3306),
      mysql_db: mysql.database,
      mysql_user: mysql.username,
      mysql_password: mysql.password,
    }),
    [dbType, mysql, sqlitePath],
  );

  const testDatabaseConnection = useCallback(async (): Promise<boolean> => {
    setMysqlTest({ state: "testing" });
    try {
      const response = syncAction(await operations.databaseTest(buildDatabasePayload()));
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
  }, [buildDatabasePayload, mysql.database, mysql.host, mysql.port, operations, syncAction]);

  const canNext = (() => {
    switch (step.id) {
      case "database":
        return dbType === "sqlite"
          ? sqlitePath.trim().length > 0
          : Boolean(
              mysql.host.trim() &&
              mysql.database.trim() &&
              mysql.username.trim() &&
              mysqlTest.state !== "testing",
            );
      case "admin":
        return (
          Boolean(admin.username.trim()) &&
          Boolean(admin.displayName.trim()) &&
          /.+@.+\..+/.test(admin.email) &&
          admin.password.length >= 10 &&
          admin.password === admin.password2
        );
      default:
        return true;
    }
  })();

  const goNext = useCallback(async () => {
    if (!canNext || actionPending) return;
    try {
      await withPending(async () => {
        if (step.id === "welcome") {
          const response = syncAction(await operations.welcomeNext());
          if (response.state) setStepFromBackend(response.state);
          return;
        }
        if (step.id === "server") {
          const response = syncAction(await operations.requirementsNext({ db_driver: dbType }));
          if (response.state) setStepFromBackend(response.state);
          return;
        }
        if (step.id === "database") {
          if (dbType === "mysql" && mysqlTest.state !== "ok") {
            const ok = await testDatabaseConnection();
            if (!ok) return;
          }
          const response = syncAction(await operations.databaseNext(buildDatabasePayload()));
          if (response.state) setStepFromBackend(response.state);
          return;
        }
        if (step.id === "dav") {
          const payload: InstallerSitePayload = {
            base_uri_override: "",
            timezone: "UTC",
            enable_files: dav.files,
            enable_calendars: dav.calendars,
            enable_contacts: dav.contacts,
            show_browser_ui: true,
          };
          syncAction(await operations.siteNext(payload));
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
            voice_enabled: meet.enabled,
            voice_stun_url: meet.stun,
            voice_turn_url: meet.turn,
            voice_turn_username: meet.turnUser,
            voice_turn_credential: meet.turnPwd,
          };
          const response = syncAction(await operations.install(payload));
          if (response.redirect) {
            onInstallRedirect?.(response.redirect);
            return;
          }
          if (response.state) setStepFromBackend(response.state);
          toast("Installation complete", { icon: <Check className="size-4" /> });
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  }, [
    actionPending,
    admin,
    buildDatabasePayload,
    canNext,
    dav,
    dbType,
    mail,
    meet,
    mysqlTest.state,
    onInstallRedirect,
    operations,
    setStepFromBackend,
    setUiStep,
    step.id,
    syncAction,
    testDatabaseConnection,
    withPending,
  ]);

  const goBack = useCallback(() => {
    if (actionPending) return;
    setStepIdx((current) => Math.max(current - 1, 0));
  }, [actionPending]);

  const goToStep = useCallback((index: number) => {
    setStepIdx(index);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  const refreshServerChecks = useCallback(async () => {
    await withPending(async () => {
      const response = syncAction(await operations.requirementsCheck({ db_driver: dbType }));
      if (response.state) setStepFromBackend(response.state, "server");
      toast("Server checks refreshed", { icon: <Check className="size-4" /> });
    });
  }, [dbType, operations, setStepFromBackend, syncAction, withPending]);

  return {
    steps: INSTALL_STEPS,
    step,
    stepIdx,
    sidebarOpen,
    setSidebarOpen,
    goToStep,
    goBack,
    goNext,
    canNext,
    actionPending,
    alreadyInstalled,
    checks,
    checkSummary,
    showChecks,
    setShowChecks,
    dbType,
    setDbType,
    sqlitePath,
    setSqlitePath,
    mysql,
    setMysql,
    dav,
    setDav,
    mail,
    setMail,
    meet,
    setMeet,
    admin,
    setAdmin,
    mysqlTest,
    setMysqlTest,
    setUiStep,
    withPending,
    syncAction,
    setStepFromBackend,
    refreshServerChecks,
    testDatabaseConnection,
  };
}

export type InstallControllerState = ReturnType<typeof useInstallController>;

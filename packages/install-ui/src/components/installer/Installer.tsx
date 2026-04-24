import { useEffect, useMemo, useState } from "react";
import { Logo } from "./Logo";
import { Stepper, STEPS } from "./Stepper";
import {
  defaultData,
  type ActionResponse,
  type BackendInstallerState,
  type BootstrapResponse,
  type InstallerData,
  type StepId,
} from "./types";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ChecksStep } from "./steps/ChecksStep";
import { DatabaseStep } from "./steps/DatabaseStep";
import { SiteStep } from "./steps/SiteStep";
import { MailStep } from "./steps/MailStep";
import { VoiceStep } from "./steps/VoiceStep";
import { AccountStep } from "./steps/AccountStep";
import { SuccessStep } from "./steps/SuccessStep";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

function backendToStep(step: BackendInstallerState["step"]): StepId {
  if (step === "installed") return "welcome";
  if (step === "requirements") return "checks";
  if (step === "done") return "success";
  return step;
}

function fromBackendState(
  state: BackendInstallerState,
  current: InstallerData,
): InstallerData {
  return {
    ...current,
    database: {
      ...current.database,
      type: state.db_driver,
      sqlitePath: state.db.sqlite_path || current.database.sqlitePath,
      mysql: {
        ...current.database.mysql,
        host: state.db.mysql_host || current.database.mysql.host,
        port: String(state.db.mysql_port ?? current.database.mysql.port),
        user: state.db.mysql_user || current.database.mysql.user,
        database: state.db.mysql_db || current.database.mysql.database,
      },
    },
    site: {
      ...current.site,
      apps: {
        files: state.enable_files,
        calendars: state.enable_calendars,
        contacts: state.enable_contacts,
      },
    },
  };
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function Installer() {
  const [step, setStep] = useState<StepId>("welcome");
  const [data, setData] = useState<InstallerData>(defaultData);
  const [backend, setBackend] = useState<BackendInstallerState | null>(null);
  const [csrf, setCsrf] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningChecks, setRunningChecks] = useState(false);
  const [dbTestStatus, setDbTestStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [dbTestMessage, setDbTestMessage] = useState("");
  const [installing, setInstalling] = useState(false);
  const [homeUrl, setHomeUrl] = useState("/");
  const [adminUrl, setAdminUrl] = useState("/admin/");

  const idx = STEPS.findIndex((s) => s.id === step);
  const alreadyInstalled = backend?.already_installed === true;
  const updatesUrl = backend?.admin_updates_url || "/admin/updates";

  const update =
    <K extends keyof InstallerData>(key: K) =>
    (patch: Partial<InstallerData[K]>) =>
      setData((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  useEffect(() => {
    void (async () => {
      try {
        const boot = await jsonFetch<BootstrapResponse>("./api/bootstrap");
        setBackend(boot.state);
        setCsrf(boot.csrf);
        setStep(backendToStep(boot.state.step));
        setData((current) => fromBackendState(boot.state, current));
      } catch (error) {
        toast.error("Could not load installer", {
          description: (error as Error).message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const checks = useMemo(() => backend?.checks ?? [], [backend?.checks]);

  useEffect(() => {
    if (step !== "database" || loading) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setDbTestStatus("testing");
      setDbTestMessage("");
      try {
        const response = await jsonFetch<ActionResponse>("./api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csrf,
            action: "database_test",
            payload: {
              db_driver: data.database.type,
              sqlite_path: data.database.sqlitePath,
              mysql_host: data.database.mysql.host,
              mysql_port: Number(data.database.mysql.port || 3306),
              mysql_db: data.database.mysql.database,
              mysql_user: data.database.mysql.user,
              mysql_password: data.database.mysql.password,
            },
          }),
        });

        if (cancelled) return;
        if (response.csrf) {
          setCsrf(response.csrf);
        }
        if (!response.ok) {
          setDbTestStatus("fail");
          setDbTestMessage(response.error || "Connection failed");
          setData((current) => ({
            ...current,
            database: { ...current.database, tested: false },
          }));
          return;
        }
        if (response.state) {
          setBackend(response.state);
          setData((current) => fromBackendState(response.state!, current));
        }
        setData((current) => ({
          ...current,
          database: { ...current.database, tested: true },
        }));
        setDbTestStatus("ok");
        setDbTestMessage("");
      } catch (error) {
        if (cancelled) return;
        setDbTestStatus("fail");
        setDbTestMessage((error as Error).message || "Connection failed");
        setData((current) => ({
          ...current,
          database: { ...current.database, tested: false },
        }));
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    step,
    loading,
    csrf,
    data.database.type,
    data.database.sqlitePath,
    data.database.mysql.host,
    data.database.mysql.port,
    data.database.mysql.database,
    data.database.mysql.user,
    data.database.mysql.password,
  ]);

  async function runAction(
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    const response = await jsonFetch<ActionResponse>("./api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrf, action, payload }),
    });
    if (response.csrf) {
      setCsrf(response.csrf);
    }
    if (!response.ok) {
      throw new Error(response.error || "Action failed");
    }
    if (response.state) {
      setBackend(response.state);
      setData((current) => fromBackendState(response.state!, current));
      setStep(backendToStep(response.state.step));
    }
    if (response.flash) {
      toast.error(response.flash);
    }

    return response;
  }

  if (loading || backend === null) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--brand-red-soft),_transparent_55%)]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-sm text-muted-foreground">Loading installer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--brand-red-soft),_transparent_55%)]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center justify-between">
          <Logo />
          {!alreadyInstalled && (
            <div className="text-xs text-muted-foreground">
              Step {Math.min(idx + 1, STEPS.length)} of {STEPS.length}
            </div>
          )}
        </header>

        {!alreadyInstalled && (
          <div className="mb-10">
            <Stepper current={step} />
          </div>
        )}

        <main className="flex-1">
          <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">
            {alreadyInstalled && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Already installed</h2>
                <p className="text-sm text-muted-foreground">
                  This instance is already configured. Continue in the admin
                  update panel.
                </p>
                <a
                  href={updatesUrl}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Open admin updates
                </a>
              </div>
            )}
            {!alreadyInstalled && step === "welcome" && (
              <WelcomeStep
                onNext={async () => {
                  try {
                    await runAction("welcome_next");
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}
              />
            )}
            {!alreadyInstalled && step === "checks" && (
              <ChecksStep
                checks={checks}
                running={runningChecks}
                onRun={async () => {
                  setRunningChecks(true);
                  try {
                    await runAction("requirements_check", {
                      db_driver: data.database.type,
                    });
                  } catch (error) {
                    toast.error((error as Error).message);
                  } finally {
                    setRunningChecks(false);
                  }
                }}
                onNext={async () => {
                  setRunningChecks(true);
                  try {
                    await runAction("requirements_next", {
                      db_driver: data.database.type,
                    });
                  } catch (error) {
                    toast.error((error as Error).message);
                  } finally {
                    setRunningChecks(false);
                  }
                }}
                onBack={() => setStep("welcome")}
              />
            )}
            {!alreadyInstalled && step === "database" && (
              <DatabaseStep
                data={data.database}
                update={update("database")}
                testStatus={dbTestStatus}
                testMessage={dbTestMessage}
                onContinue={async () => {
                  if (dbTestStatus !== "ok") {
                    toast.error("Database connection is not ready yet.");
                    return;
                  }
                  try {
                    await runAction("database_next", {
                      db_driver: data.database.type,
                      sqlite_path: data.database.sqlitePath,
                      mysql_host: data.database.mysql.host,
                      mysql_port: Number(data.database.mysql.port || 3306),
                      mysql_db: data.database.mysql.database,
                      mysql_user: data.database.mysql.user,
                      mysql_password: data.database.mysql.password,
                    });
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}
                onBack={() => setStep("checks")}
              />
            )}
            {!alreadyInstalled && step === "site" && (
              <SiteStep
                data={data.site}
                update={update("site")}
                onNext={async () => {
                  if (
                    !data.site.apps.files &&
                    !data.site.apps.calendars &&
                    !data.site.apps.contacts
                  ) {
                    toast.error("Enable at least one app before continuing.");
                    return;
                  }

                  try {
                    await runAction("site_next", {
                      base_uri_override: "",
                      timezone: backend.timezone,
                      enable_files: data.site.apps.files,
                      enable_calendars: data.site.apps.calendars,
                      enable_contacts: data.site.apps.contacts,
                      show_browser_ui: false,
                    });
                    setStep("mail");
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}
                onBack={() => setStep("database")}
              />
            )}
            {!alreadyInstalled && step === "mail" && (
              <MailStep
                data={data.mail}
                update={update("mail")}
                onSkip={() => {
                  update("mail")({ enabled: false });
                  setStep("voice");
                }}
                onNext={() => {
                  update("mail")({ enabled: true });
                  setStep("voice");
                }}
                onBack={() => setStep("site")}
              />
            )}
            {!alreadyInstalled && step === "voice" && (
              <VoiceStep
                data={data.voice}
                update={update("voice")}
                onSkip={() => {
                  update("voice")({ enabled: false });
                  setStep("account");
                }}
                onNext={() => {
                  update("voice")({ enabled: true });
                  setStep("account");
                }}
                onBack={() => setStep("mail")}
              />
            )}
            {!alreadyInstalled && step === "account" && (
              <AccountStep
                data={data.account}
                update={update("account")}
                installing={installing}
                onFinish={async () => {
                  setInstalling(true);
                  try {
                    const response = await runAction("install", {
                      username: data.account.username,
                      display_name: data.account.displayName,
                      email: data.account.email,
                      password: data.account.password,
                      password_confirm: data.account.password,
                      mail_enabled: data.mail.enabled,
                      mail_imap_host: data.mail.imapHost,
                      mail_imap_port: data.mail.imapPort,
                      mail_imap_security: data.mail.imapSecurity,
                      mail_smtp_host: data.mail.smtpHost,
                      mail_smtp_port: data.mail.smtpPort,
                      mail_smtp_security: data.mail.smtpSecurity,
                      voice_enabled: data.voice.enabled,
                      voice_turn_url: data.voice.turnUrl,
                      voice_turn_username: data.voice.turnUser,
                      voice_turn_credential: data.voice.turnPassword,
                    });
                    const flashFromState =
                      response.state?.flash && response.state.flash.trim() !== ""
                        ? response.state.flash
                        : null;
                    if (flashFromState) {
                      throw new Error(flashFromState);
                    }

                    const redirectTarget =
                      typeof response.redirect === "string" &&
                      response.redirect.trim() !== ""
                        ? response.redirect
                        : null;

                    const installCompleted =
                      response.state?.step === "done" ||
                      response.state?.step === "installed" ||
                      (redirectTarget !== null &&
                        /\/admin\/?$/.test(redirectTarget));

                    if (!installCompleted) {
                      throw new Error(
                        "Install did not finalize. Verify DB settings and write permissions, then try again.",
                      );
                    }

                    if (redirectTarget) {
                      setAdminUrl(redirectTarget);
                      setHomeUrl(redirectTarget.replace(/\/admin\/?$/, "/"));
                    }
                    setStep("success");
                  } catch (error) {
                    toast.error((error as Error).message);
                  } finally {
                    setInstalling(false);
                  }
                }}
                onBack={() => setStep("voice")}
              />
            )}
            {!alreadyInstalled && step === "success" && (
              <SuccessStep
                siteName={data.site.name}
                homeUrl={homeUrl}
                adminUrl={adminUrl}
              />
            )}
          </div>
        </main>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          WeGotWorkspace · Private Workspace Installer
        </footer>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

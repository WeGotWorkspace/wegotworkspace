import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { useSettings, store } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/updates")({ component: UpdatesPage });

function UpdatesPage() {
  const settings = useSettings();
  const updates = settings.updates;
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [clearingLog, setClearingLog] = useState(false);
  const [displayPhase, setDisplayPhase] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [inlineResult, setInlineResult] = useState<{
    kind: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    void store.reloadUpdateState();
    void store.readUpdateLog().then((lines) => setLogLines([...lines].reverse()));
  }, []);

  useEffect(() => {
    if (!updates.inProgress && !applying) {
      return;
    }
    const id = window.setInterval(() => {
      void store.reloadUpdateState();
    }, 700);

    return () => {
      window.clearInterval(id);
    };
  }, [updates.inProgress, applying]);

  useEffect(() => {
    if (updates.phase) {
      setDisplayPhase(updates.phase);
      return;
    }
    if (!updates.inProgress && !applying) {
      setDisplayPhase(null);
    }
  }, [updates.phase, updates.inProgress, applying]);

  const latestVersion = updates.latest?.version || "Unknown";
  const phaseOrder = ["downloading", "extracting", "backing_up", "applying_files"] as const;
  const visiblePhase = updates.phase ?? displayPhase;
  const activePhase = visiblePhase === "running_migrations" ? "applying_files" : visiblePhase;
  const currentStepIndex = Math.max(
    0,
    phaseOrder.indexOf(activePhase as (typeof phaseOrder)[number]),
  );
  const currentStep = Math.max(1, currentStepIndex + 1);
  const downloadPercent = updates.download?.percent;
  const downloadTotal = updates.download?.totalBytes;
  const downloadDone = updates.download?.downloadedBytes ?? 0;
  const phaseLabel =
    visiblePhase === "downloading"
      ? "Downloading package"
      : visiblePhase === "extracting"
        ? "Extracting archive"
        : visiblePhase === "backing_up"
          ? "Creating backup"
          : visiblePhase === "applying_files"
            ? "Replacing files"
            : visiblePhase === "running_migrations"
              ? "Running migrations"
              : visiblePhase
                ? visiblePhase
                : updates.inProgress || applying
                  ? "Starting update"
                  : "Idle";
  const phasePercent =
    visiblePhase === "downloading"
      ? (updates.download?.percent ?? null)
      : visiblePhase === "extracting" || visiblePhase === "backing_up"
        ? (updates.phaseProgress?.percent ?? null)
        : null;
  const displayedResult =
    inlineResult ??
    (updates.lastResult && !(updates.inProgress || applying)
      ? {
          kind: updates.lastResult.ok ? ("success" as const) : ("error" as const),
          title: "Last update",
          message: updates.lastResult.ok
            ? `Successfully updated to ${updates.lastResult.version}.`
            : updates.lastResult.message || "The last update attempt failed.",
          finishedAt: updates.lastResult.finishedAt,
          historical: true as const,
        }
      : null);
  const resultTimestamp =
    displayedResult && "finishedAt" in displayedResult && displayedResult.finishedAt
      ? new Date(displayedResult.finishedAt).toLocaleString()
      : null;

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    const precision = value >= 100 || idx === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[idx]}`;
  };

  return (
    <AdminShell>
      <div className="px-10 py-10 max-w-6xl">
        <PageHeader
          eyebrow="Maintenance"
          title="Updates"
          description="Check for new releases and apply updates with backup and rollback support."
          actions={
            <Button
              variant="outline"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                try {
                  await store.checkUpdates();
                  setInlineResult(null);
                } catch (error) {
                  setInlineResult({
                    kind: "error",
                    title: "Could not check updates",
                    message: (error as Error).message || "Unknown error while checking updates.",
                  });
                } finally {
                  setChecking(false);
                }
              }}
            >
              {checking ? "Checking..." : "Check now"}
            </Button>
          }
        />
        <div className="mb-3 text-xs text-muted-foreground">
          Last checked: {updates.lastCheckedAt ?? "Never"}
        </div>

        <Section
          title="Apply update"
          description="Runs staged download, integrity checks, file swap, and DB migrations."
        >
          <div className="space-y-3">
            <Button
              disabled={
                !updates.updateAvailable || !updates.compatible || updates.inProgress || applying
              }
              onClick={async () => {
                setApplying(true);
                setInlineResult(null);
                try {
                  const result = await store.applyUpdate();
                  if (result.ok) {
                    setInlineResult({
                      kind: "success",
                      title: "Update completed",
                      message: result.message || "The update was applied successfully.",
                    });
                  } else {
                    setInlineResult({
                      kind: "error",
                      title: "Update stopped",
                      message: result.message || "The update stopped before completion.",
                    });
                  }
                } catch (error) {
                  setInlineResult({
                    kind: "error",
                    title: "Update failed",
                    message: (error as Error).message || "An unknown updater error occurred.",
                  });
                } finally {
                  setApplying(false);
                }
              }}
            >
              {updates.inProgress || applying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating
                </>
              ) : (
                "Update now"
              )}
            </Button>
            {(updates.inProgress || applying) && (
              <div className="rounded-md border px-3 py-3 text-xs space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    Step {currentStep}/4: {phaseLabel}
                  </div>
                  <Badge variant="secondary">
                    {updates.current?.to ? `v${updates.current.to}` : "Update"}
                  </Badge>
                </div>
                {typeof phasePercent === "number" && (
                  <div className="space-y-2">
                    <Progress value={phasePercent} />
                    <div className="flex items-center justify-between text-muted-foreground">
                      {visiblePhase === "downloading" ? (
                        <span>
                          {formatBytes(downloadDone)}
                          {downloadTotal ? ` / ${formatBytes(downloadTotal)}` : ""}
                        </span>
                      ) : (
                        <span>
                          {updates.phaseProgress?.completed ?? 0} /{" "}
                          {updates.phaseProgress?.total ?? 0} files
                        </span>
                      )}
                      <span>{phasePercent}%</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!updates.cancelAllowed || updates.cancelRequested || cancelling}
                    onClick={async () => {
                      setCancelling(true);
                      try {
                        await store.cancelUpdate();
                        setInlineResult({
                          kind: "success",
                          title: "Cancellation requested",
                          message: "The updater will stop at the next safe checkpoint.",
                        });
                      } catch (error) {
                        setInlineResult({
                          kind: "error",
                          title: "Could not cancel update",
                          message: (error as Error).message || "Cancellation request failed.",
                        });
                      } finally {
                        setCancelling(false);
                      }
                    }}
                  >
                    {updates.cancelRequested || cancelling ? "Cancelling..." : "Cancel update"}
                  </Button>
                </div>
              </div>
            )}
            {displayedResult && (
              <Alert
                variant={displayedResult.kind === "error" ? "destructive" : "default"}
                className={
                  displayedResult.kind === "success" ? "border-emerald-300 bg-emerald-50" : ""
                }
              >
                {displayedResult.kind === "success" ? (
                  <CircleCheck className="h-4 w-4 text-emerald-700" />
                ) : (
                  <TriangleAlert className="h-4 w-4" />
                )}
                <AlertTitle>{displayedResult.title}</AlertTitle>
                <AlertDescription>
                  {displayedResult.message}
                  {resultTimestamp ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {"historical" in displayedResult
                        ? displayedResult.kind === "success"
                          ? `Completed: ${resultTimestamp}`
                          : `Failed at: ${resultTimestamp}`
                        : `Applied at: ${resultTimestamp}`}
                    </div>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Section>

        <Section
          title="Release status"
          description="Installed version and latest available release."
        >
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <span>Installed version</span>
              <Badge variant="secondary">{updates.installedVersion}</Badge>
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <span>Latest version</span>
              <Badge variant={updates.updateAvailable ? "default" : "secondary"}>
                {latestVersion}
              </Badge>
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <span>Schema version</span>
              <Badge variant="secondary">{updates.schemaVersion}</Badge>
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <span>Compatibility</span>
              <Badge variant={updates.compatible ? "secondary" : "destructive"}>
                {updates.compatible ? "Ready" : "Action required"}
              </Badge>
            </div>
            {updates.lastCheckError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Last check error: {updates.lastCheckError}
              </div>
            )}
            {updates.latest?.notes_url && (
              <a
                href={String(updates.latest.notes_url)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Read release notes
              </a>
            )}
          </div>
        </Section>

        <Section
          title="Server checks"
          description="Environment checks that must pass before update."
        >
          <div className="space-y-2">
            {updates.checks.map((check) => (
              <div
                key={check.label}
                className="flex items-start justify-between gap-4 border rounded-md px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{check.label}</div>
                  <div className="text-xs text-muted-foreground">{check.detail}</div>
                </div>
                <Badge variant={check.ok ? "secondary" : "destructive"}>
                  {check.ok ? "OK" : "Fail"}
                </Badge>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Update log"
          description="Most recent updater events and diagnostics."
          aside={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const lines = await store.readUpdateLog();
                  setLogLines([...lines].reverse());
                }}
              >
                Refresh log
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clearingLog || logLines.length === 0}
                  >
                    Empty log
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Empty update log?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all log entries from disk. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setClearingLog(true);
                        try {
                          const lines = await store.clearUpdateLog();
                          setLogLines([...lines].reverse());
                        } finally {
                          setClearingLog(false);
                        }
                      }}
                    >
                      Empty log
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          }
        >
          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
            {logLines.length > 0 ? logLines.join("\n") : "No log entries yet."}
          </pre>
        </Section>
      </div>
    </AdminShell>
  );
}

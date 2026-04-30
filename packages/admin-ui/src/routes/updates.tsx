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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleCheck,
  Download,
  Loader2,
  Trash2,
  TriangleAlert,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/updates")({ component: UpdatesPage });

function UpdatesPage() {
  const settings = useSettings();
  const updates = settings.updates;
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [updatesLoaded, setUpdatesLoaded] = useState(false);
  const [clearingLog, setClearingLog] = useState(false);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const [displayPhase, setDisplayPhase] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [inlineResult, setInlineResult] = useState<{
    kind: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await store.reloadUpdateState();
      const lines = await store.readUpdateLog();
      if (cancelled) {
        return;
      }
      setLogLines([...lines].reverse());
      setUpdatesLoaded(true);
    };
    void load();

    return () => {
      cancelled = true;
    };
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
  const backups = updates.backups ?? [];
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
  const formatDateTime = (value: string | null | undefined) => {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
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
                  toast.success("Update check completed");
                } catch (error) {
                  setInlineResult({
                    kind: "error",
                    title: "Could not check updates",
                    message: (error as Error).message || "Unknown error while checking updates.",
                  });
                  toast.error((error as Error).message || "Could not check for updates");
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
          Last checked: {formatDateTime(updates.lastCheckedAt) ?? "Never"}
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
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Property</th>
                  <th className="text-left font-medium px-4 py-2.5">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Installed version</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{updates.installedVersion}</Badge>
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Latest version</td>
                  <td className="px-4 py-3">
                    <Badge variant={updates.updateAvailable ? "default" : "secondary"}>
                      {latestVersion}
                    </Badge>
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Schema version</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{updates.schemaVersion}</Badge>
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Compatibility</td>
                  <td className="px-4 py-3">
                    <Badge variant={updates.compatible ? "secondary" : "destructive"}>
                      {updates.compatible ? "Ready" : "Action required"}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {updates.lastCheckError && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              Last check error: {updates.lastCheckError}
            </div>
          )}
          {updates.latest?.notes_url && (
            <a
              href={String(updates.latest.notes_url)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Read release notes
            </a>
          )}
        </Section>

        <Section title="Backups" description="Archived update backups stored as ZIP files.">
          {!updatesLoaded ? (
            <div className="rounded-md border px-3 py-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
              No backups available yet.
            </div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Filename</th>
                    <th className="text-left font-medium px-4 py-2.5">Created</th>
                    <th className="text-left font-medium px-4 py-2.5">Version</th>
                    <th className="text-right font-medium px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.name} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium break-all">{backup.name}</div>
                        <div className="text-xs text-muted-foreground">{formatBytes(backup.sizeBytes)}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {backup.modifiedAt
                          ? new Date(backup.modifiedAt).toLocaleString()
                          : "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {backup.fromVersion && backup.toVersion
                          ? `${backup.fromVersion} -> ${backup.toVersion}`
                          : backup.downloadable === false
                            ? "Legacy folder"
                            : "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <TooltipProvider delayDuration={150}>
                          <div className="flex items-center justify-end gap-2">
                            {backup.downloadable === false ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" disabled>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download unavailable for legacy folders</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild variant="outline" size="icon">
                                    <a
                                      href={`/admin/api/updates/backups/download?name=${encodeURIComponent(
                                        backup.name,
                                      )}`}
                                      onClick={() => {
                                        toast.success(`Download started for ${backup.name}`);
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download backup</TooltipContent>
                              </Tooltip>
                            )}
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={deletingBackup === backup.name}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Delete backup</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete backup file?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove {backup.name}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    setDeletingBackup(backup.name);
                                    try {
                                      await store.deleteBackup(backup.name);
                                      toast.success(`Deleted backup ${backup.name}`);
                                    } catch (error) {
                                      toast.error(
                                        (error as Error).message || `Could not delete ${backup.name}`,
                                      );
                                    } finally {
                                      setDeletingBackup(null);
                                    }
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Server checks"
          description="Environment checks that must pass before update."
        >
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Check</th>
                  <th className="text-left font-medium px-4 py-2.5">Detail</th>
                  <th className="text-right font-medium px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {updates.checks.map((check) => (
                  <tr key={check.label} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{check.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{check.detail}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center justify-end gap-1 text-xs font-medium ${check.ok ? "text-emerald-700" : "text-destructive"}`}
                      >
                        {check.ok ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {check.ok ? "OK" : "Fail"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  try {
                    const lines = await store.readUpdateLog();
                    setLogLines([...lines].reverse());
                    toast.success("Update log refreshed");
                  } catch (error) {
                    toast.error((error as Error).message || "Could not refresh update log");
                  }
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
                          toast.success("Update log cleared");
                        } catch (error) {
                          toast.error((error as Error).message || "Could not clear update log");
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

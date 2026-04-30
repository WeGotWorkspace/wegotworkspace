import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { useSettings, store } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/updates")({ component: UpdatesPage });

function UpdatesPage() {
  const settings = useSettings();
  const updates = settings.updates;
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    void store.reloadUpdateState();
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

  const latestVersion = updates.latest?.version || "Unknown";
  const downloadPercent = updates.download?.percent;
  const downloadTotal = updates.download?.totalBytes;
  const downloadDone = updates.download?.downloadedBytes ?? 0;
  const phaseLabel =
    updates.phase === "downloading"
      ? "Downloading package"
      : updates.phase === "extracting"
        ? "Extracting archive"
        : updates.phase === "backing_up"
          ? "Creating backup"
          : updates.phase === "applying_files"
            ? "Replacing files"
            : updates.phase === "running_migrations"
              ? "Running migrations"
              : updates.phase
                ? updates.phase
                : "Idle";

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
                  toast.success("Checked for updates");
                } catch (error) {
                  toast.error((error as Error).message || "Could not check updates");
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
                try {
                  const result = await store.applyUpdate();
                  if (result.ok) {
                    toast.success("Update completed");
                  } else {
                    toast.info(result.message || "Update stopped");
                  }
                } catch (error) {
                  toast.error((error as Error).message || "Update failed");
                } finally {
                  setApplying(false);
                }
              }}
            >
              {updates.inProgress || applying ? "Applying..." : "Update now"}
            </Button>
            {(updates.inProgress || applying) && (
              <div className="rounded-md border px-3 py-2 text-xs space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Current step</span>
                  <Badge variant="secondary">{phaseLabel}</Badge>
                </div>
                {updates.phase === "downloading" && (
                  <div className="space-y-2">
                    <Progress
                      value={typeof downloadPercent === "number" ? downloadPercent : undefined}
                    />
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>
                        {formatBytes(downloadDone)}
                        {downloadTotal ? ` / ${formatBytes(downloadTotal)}` : ""}
                      </span>
                      <span>
                        {typeof downloadPercent === "number"
                          ? `${downloadPercent}%`
                          : "Streaming..."}
                      </span>
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
                        toast.success("Cancellation requested");
                      } catch (error) {
                        toast.error((error as Error).message || "Could not cancel update");
                      } finally {
                        setCancelling(false);
                      }
                    }}
                  >
                    {updates.cancelRequested || cancelling ? "Cancelling..." : "Cancel update"}
                  </Button>
                </div>
                {updates.phase !== "downloading" && (
                  <div className="text-muted-foreground">
                    Cancellation is only possible while the package is downloading.
                  </div>
                )}
              </div>
            )}
            {updates.lastResult && (
              <div className="rounded-md border px-3 py-2 text-xs">
                <div>
                  Last run: <strong>{updates.lastResult.ok ? "Success" : "Failed"}</strong>
                </div>
                <div className="text-muted-foreground">{updates.lastResult.message}</div>
              </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const lines = await store.readUpdateLog();
                setLogLines(lines);
              }}
            >
              Refresh log
            </Button>
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

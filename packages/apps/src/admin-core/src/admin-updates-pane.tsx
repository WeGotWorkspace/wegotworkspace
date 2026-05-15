import { useMemo } from "react";
import { Check, Download, Eraser, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/button/src/button";
import { Callout } from "@/callout/src/callout";
import { Card } from "@/card/src/card";
import { DataTable, type DataTableColumn } from "@/data-table/src/data-table";
import { MenuItem } from "@/menu-item/src/menu-item";
import { Tag } from "@/tag/src/tag";
import {
  formatByteCount,
  formatHumanDateTime,
  getServerCheckVisual,
  parseUpdateLogLine,
  UPDATE_PROGRESS_STEPS,
  type UpdateLogRow,
} from "@/admin-core/src/admin-workspace-utils";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

export type AdminUpdatesPaneProps = {
  controller: AdminControllerState;
  setConfirmClearLogsOpen: (open: boolean) => void;
  setConfirmUpdateOpen: (open: boolean) => void;
  updatingNow: boolean;
};

export function AdminUpdatesPane({
  controller,
  setConfirmClearLogsOpen,
  setConfirmUpdateOpen,
  updatingNow,
}: AdminUpdatesPaneProps) {
  const updateLogRows = useMemo(
    () =>
      controller.updateLogLines.map((line, index) => parseUpdateLogLine(line, index)).slice(-25),
    [controller.updateLogLines],
  );

  const activeProgressStep = UPDATE_PROGRESS_STEPS.findIndex((step) =>
    step.phases.includes(controller.updates.phase ?? ""),
  );
  const completedProgressSteps =
    activeProgressStep < 0
      ? 0
      : Math.min(UPDATE_PROGRESS_STEPS.length, Math.max(activeProgressStep + 1, 1));
  const displayProgressCount =
    controller.updates.phase === "downloading" && controller.updates.download
      ? controller.updates.download.totalBytes && controller.updates.download.totalBytes > 0
        ? `${formatByteCount(controller.updates.download.downloadedBytes)} / ${formatByteCount(controller.updates.download.totalBytes)}`
        : `${formatByteCount(controller.updates.download.downloadedBytes)} downloaded`
      : controller.updates.phaseProgress
        ? `${Math.min(controller.updates.phaseProgress.completed, controller.updates.phaseProgress.total)} / ${controller.updates.phaseProgress.total}`
        : `${Math.max(0, completedProgressSteps)} / ${UPDATE_PROGRESS_STEPS.length}`;
  const progressPercent =
    controller.updates.phase === "downloading" && controller.updates.download
      ? controller.updates.download.percent !== null &&
        controller.updates.download.percent !== undefined
        ? Math.max(2, Math.min(100, controller.updates.download.percent))
        : 6
      : controller.updates.phaseProgress?.percent
        ? Math.max(2, Math.min(100, controller.updates.phaseProgress.percent))
        : activeProgressStep >= 0
          ? Math.max(
              2,
              Math.min(95, ((activeProgressStep + 1) / UPDATE_PROGRESS_STEPS.length) * 100),
            )
          : 2;

  const logColumns: DataTableColumn<UpdateLogRow>[] = useMemo(
    () => [
      {
        key: "time",
        header: "Date",
        headerClassName: "font-medium pb-3 pr-3",
        cellClassName: "py-3 pr-3 whitespace-nowrap font-mono text-xs",
        render: (row) => formatHumanDateTime(row.date),
      },
      {
        key: "level",
        header: "Level",
        headerClassName: "font-medium pb-3 pr-3",
        cellClassName: "py-3 pr-3 whitespace-nowrap",
        render: (row) => row.level,
      },
      {
        key: "message",
        header: "Message",
        headerClassName: "font-medium pb-3",
        cellClassName: "py-3",
        render: (row) => row.message,
      },
    ],
    [],
  );

  return (
    <>
      <Card title="Release status">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{
                color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
              }}
            >
              Installed
            </div>
            <div
              className="text-2xl"
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
            >
              <Tag label={controller.updates.installedVersion || "-"} />
            </div>
          </div>
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{
                color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
              }}
            >
              Latest
            </div>
            <div
              className="text-2xl"
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
            >
              <Tag
                label={
                  controller.updates.latest?.version ?? controller.updates.installedVersion ?? "-"
                }
              />
            </div>
          </div>
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{
                color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
              }}
            >
              Channel
            </div>
            <Tag label="stable" />
          </div>
          <div className="flex-1 min-w-32">
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{
                color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
              }}
            >
              Last checked
            </div>
            <Tag label={formatHumanDateTime(controller.updates.lastCheckedAt)} />
          </div>
        </div>
        <Callout
          className="mt-5"
          severity={
            controller.updates.inProgress
              ? "warning"
              : controller.updates.updateAvailable
                ? "warning"
                : "success"
          }
          title={
            controller.updates.inProgress
              ? "Update in progress"
              : controller.updates.updateAvailable
                ? "Update available"
                : "You're up to date"
          }
          message={
            controller.updates.inProgress
              ? `Applying ${controller.updates.current?.from ?? controller.updates.installedVersion} -> ${controller.updates.current?.to ?? controller.updates.latest?.version ?? "latest"} (${controller.updates.phase?.replace(/_/g, " ") ?? "processing"}).`
              : controller.updates.updateAvailable
                ? `${controller.updates.latest?.version ?? "Latest"} introduces faster sync and security patches.`
                : "Running the latest stable release."
          }
        />
        {controller.updates.inProgress ? (
          <div
            className="mt-5 rounded-lg border p-4"
            style={{
              backgroundColor: "color-mix(in oklab, var(--color-ink) 4%, transparent)",
              borderColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                style={{
                  color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
                }}
              >
                Update progress
              </div>
              <div
                className="text-xs tabular-nums"
                style={{
                  color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
                }}
              >
                {displayProgressCount}
              </div>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden mb-4"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
              }}
            >
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%`, backgroundColor: "#2f302c" }}
              />
            </div>
            <ol className="space-y-2">
              {UPDATE_PROGRESS_STEPS.map((step, index) => {
                const isDone = activeProgressStep > index;
                const isActive = activeProgressStep === index;
                return (
                  <li key={step.label} className="flex items-center gap-3 text-sm">
                    <span
                      className="size-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor:
                          isDone || isActive
                            ? "var(--color-ink)"
                            : "color-mix(in oklab, var(--color-ink) 12%, transparent)",
                        color:
                          isDone || isActive ? "var(--color-cream, #f5f1e8)" : "var(--color-ink)",
                      }}
                    >
                      {isDone ? (
                        <Check className="size-3" />
                      ) : isActive ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span style={{ color: "var(--color-ink)" }}>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
        {controller.updates.lastCheckError ? (
          <p className="mt-3 text-sm text-red-700">{controller.updates.lastCheckError}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={controller.actions.checkUpdates}
            disabled={controller.checkingUpdates}
          >
            {controller.checkingUpdates ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            {controller.checkingUpdates ? "Checking..." : "Check for updates"}
          </Button>
          <Button
            onClick={() => setConfirmUpdateOpen(true)}
            disabled={
              !controller.updates.updateAvailable || !controller.updates.compatible || updatingNow
            }
          >
            <Download className="size-4 mr-2" />
            {`Update to ${controller.updates.latest?.version ?? "latest"}`}
          </Button>
        </div>
      </Card>

      <Card
        title="Server checks"
        iconActions={[
          {
            icon: <RefreshCw className="size-4" />,
            label: "Refresh checks",
            onClick: controller.actions.refreshServerChecks,
            disabled: controller.refreshingServerChecks,
          },
        ]}
      >
        <div className="space-y-1">
          {controller.updates.checks.map((check, index) =>
            (() => {
              const { Icon, color } = getServerCheckVisual(check);
              return (
                <MenuItem
                  key={`${check.label}-${index}`}
                  className="px-0 py-2 text-(--color-ink) hover:bg-transparent focus-visible:ring-0"
                  icon={<Icon style={{ color }} />}
                  label={check.label}
                  description={check.detail}
                />
              );
            })(),
          )}
        </div>
      </Card>

      <Card
        title="Update log"
        iconActions={[
          {
            icon: <Download className="size-4" />,
            label: "Download full log",
            onClick: controller.actions.downloadUpdateLog,
          },
          {
            icon: <RefreshCw className="size-4" />,
            label: "Refresh logs",
            onClick: controller.actions.refreshUpdateLog,
          },
          {
            icon: <Eraser className="size-4" />,
            label: "Clear logs",
            onClick: () => setConfirmClearLogsOpen(true),
          },
        ]}
      >
        <DataTable
          data={updateLogRows}
          columns={logColumns}
          rowKey={(row) => row.id}
          className="-mx-6 px-6"
          tableClassName="w-full text-sm"
          headerClassName="text-left text-[10px] uppercase tracking-[0.18em]"
          rowClassName="border-t"
          rowStyle={() => ({
            borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
          })}
        />
      </Card>
    </>
  );
}

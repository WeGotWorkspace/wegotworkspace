import { useMemo, useState } from "react";
import { Loader2, RefreshCw, StopCircle } from "lucide-react";
import { Button } from "@/button/src/button";
import { Callout } from "@/callout/src/callout";
import { Card } from "@/card/src/card";
import { DataTable, type DataTableColumn } from "@/data-table/src/data-table";
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
import {
  parseUpdateLogLine,
  formatHumanDateTime,
  type UpdateLogRow,
} from "@/admin-core/src/admin-workspace-utils";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

export function AdminSearchPane({ controller }: { controller: AdminControllerState }) {
  const [confirmReindexOpen, setConfirmReindexOpen] = useState(false);
  const [runningAction, setRunningAction] = useState(false);

  const rows = useMemo(
    () =>
      controller.searchReindex.logLines
        .map((line, index) => parseUpdateLogLine(line, index))
        .slice(-25),
    [controller.searchReindex.logLines],
  );
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
        key: "message",
        header: "Message",
        headerClassName: "font-medium pb-3",
        cellClassName: "py-3",
        render: (row) => row.message,
      },
    ],
    [],
  );

  const progress = controller.searchReindex.phaseProgress;
  const progressPercent = progress ? Math.max(2, Math.min(100, progress.percent)) : 0;

  return (
    <>
      <Card
        title="Search indexing"
        iconActions={[
          {
            icon: <RefreshCw className="size-4" />,
            label: "Refresh state",
            onClick: controller.actions.refreshSearchReindexState,
          },
        ]}
      >
        <Callout
          severity={controller.searchReindex.inProgress ? "warning" : "success"}
          title={controller.searchReindex.inProgress ? "Reindex in progress" : "Indexer idle"}
          message={
            controller.searchReindex.inProgress
              ? `Current phase: ${(controller.searchReindex.phase ?? "starting").replace(/_/g, " ")}.`
              : (controller.searchReindex.lastResult?.message ?? "No reindex is currently running.")
          }
        />
        {progress ? (
          <div className="admin-updates-progress-card">
            <div className="admin-updates-progress-head">
              <div className="admin-updates-stat-label--strong">Search reindex progress</div>
              <div className="admin-updates-progress-count">
                {`${Math.min(progress.completed, progress.total)} / ${progress.total}`}
              </div>
            </div>
            <div className="admin-updates-progress-track">
              <div
                className="admin-updates-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="admin-updates-actions">
          <Button
            onClick={() => setConfirmReindexOpen(true)}
            disabled={controller.searchReindex.inProgress || runningAction}
          >
            {runningAction ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Re-index search
          </Button>
          <Button
            variant="outline"
            onClick={controller.actions.cancelSearchReindex}
            disabled={!controller.searchReindex.inProgress}
          >
            <StopCircle className="size-4 mr-2" />
            Cancel
          </Button>
        </div>
      </Card>

      <Card title="Search reindex log">
        <DataTable
          data={rows}
          columns={logColumns}
          rowKey={(row) => row.id}
          className="-mx-6 px-6"
          tableClassName="w-full text-sm"
          headerClassName="admin-table-head"
          rowClassName="admin-data-table-row"
        />
      </Card>

      <AlertDialog open={confirmReindexOpen} onOpenChange={setConfirmReindexOpen}>
        <AlertDialogContent className="admin-dialog-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>Start a full search reindex?</AlertDialogTitle>
            <AlertDialogDescription>
              This will rebuild the unified search index for files, calendars, and contacts. It may
              take a while on larger installations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runningAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={runningAction}
              onClick={async () => {
                setRunningAction(true);
                try {
                  await controller.actions.startSearchReindex();
                } finally {
                  setRunningAction(false);
                  setConfirmReindexOpen(false);
                }
              }}
            >
              {runningAction ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start reindex"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

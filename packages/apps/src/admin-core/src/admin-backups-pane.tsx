import { Download, FileArchive, Trash2 } from "lucide-react";
import { Card } from "@/card/src/card";
import { DataTable, type DataTableColumn } from "@/data-table/src/data-table";
import { formatHumanDateTime } from "@/admin-core/src/admin-workspace-utils";
import { IconActionButton } from "@/admin-core/src/admin-workspace-widgets";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

export type AdminBackupsPaneProps = {
  controller: AdminControllerState;
};

export function AdminBackupsPane({ controller }: AdminBackupsPaneProps) {
  const backupColumns: DataTableColumn<(typeof controller.updates.backups)[number]>[] = [
    {
      key: "file",
      header: "File",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3",
      render: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          <FileArchive className="size-4 shrink-0 opacity-60" />
          <span className="truncate font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3 whitespace-nowrap",
      render: (row) => (
        <span style={{ color: "color-mix(in oklab, var(--color-ink) 65%, transparent)" }}>
          {formatHumanDateTime(row.modifiedAt)}
        </span>
      ),
    },
    {
      key: "version",
      header: "Version",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3 whitespace-nowrap",
      render: (row) => (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
          style={{
            backgroundColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
            color: "var(--color-ink)",
          }}
        >
          {row.toVersion ?? row.fromVersion ?? "-"}
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      headerClassName: "font-medium pb-3 pr-3",
      cellClassName: "py-3 pr-3 whitespace-nowrap",
      render: (row) => (
        <span style={{ color: "color-mix(in oklab, var(--color-ink) 65%, transparent)" }}>
          {`${Math.round(row.sizeBytes / 1024 / 1024)} MB`}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "font-medium pb-3 w-1",
      cellClassName: "py-3 whitespace-nowrap text-right",
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {row.downloadable ? (
            <IconActionButton
              label={`Download ${row.name}`}
              onClick={() => controller.actions.downloadBackup(row.name)}
            >
              <Download className="size-4" />
            </IconActionButton>
          ) : null}
          <IconActionButton
            label={`Delete ${row.name}`}
            onClick={() => controller.actions.deleteBackup(row.name)}
          >
            <Trash2 className="size-4" />
          </IconActionButton>
        </div>
      ),
    },
  ];

  return (
    <Card title="Database backups">
      <DataTable
        data={controller.updates.backups}
        columns={backupColumns}
        rowKey={(row) => row.name}
        className="-mx-6 px-6"
        tableClassName="w-full text-sm"
        headerClassName="text-left text-[10px] uppercase tracking-[0.18em]"
        rowClassName="border-t"
        rowStyle={() => ({
          borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
        })}
      />
    </Card>
  );
}

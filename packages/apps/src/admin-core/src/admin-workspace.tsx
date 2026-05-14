import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleX,
  Download,
  Eraser,
  FileArchive,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import { Input } from "@/ui/input";
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
import { Button, IconButton } from "@/button/src/button";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { Card } from "@/card/src/card";
import { Callout } from "@/callout/src/callout";
import { DataTable, type DataTableColumn } from "@/data-table/src/data-table";
import { FormField } from "@/form-field/src/form-field";
import { MenuItem } from "@/menu-item/src/menu-item";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import {
  WorkspaceAppLayout,
  WorkspaceSidebarToggle,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { useAdminController } from "@/admin-core/src/use-admin-controller";
import type { AdminWorkspaceProps } from "@/admin-core/src/admin-workspace-props";
import { Tag } from "@/tag/src/tag";

type UpdateLogRow = { id: string; date: string | null; level: string; message: string };

type CheckVisual = { Icon: typeof CheckCircle2; color: string };

function getServerCheckVisual(check: {
  ok: boolean;
  status?: string;
  detail?: string;
}): CheckVisual {
  const normalizedStatus = (check.status ?? "").toLowerCase();
  const normalizedDetail = (check.detail ?? "").toLowerCase();

  if (
    normalizedStatus === "error" ||
    normalizedStatus === "fail" ||
    normalizedStatus === "failed"
  ) {
    return { Icon: CircleX, color: "#b14242" };
  }

  if (
    normalizedStatus === "warn" ||
    normalizedStatus === "warning" ||
    normalizedStatus === "unknown"
  ) {
    return { Icon: AlertTriangle, color: "#c98a1f" };
  }

  if (normalizedDetail.startsWith("unknown")) {
    return { Icon: AlertTriangle, color: "#c98a1f" };
  }

  if (check.ok) {
    return { Icon: CheckCircle2, color: "#3a8f5a" };
  }

  return { Icon: CircleX, color: "#b14242" };
}

function parseUpdateLogLine(line: string, index: number): UpdateLogRow {
  const matchWithLevel = line.match(/^\[([^\]]+)\]\s+\[([A-Z]+)\]\s+(.*)$/);
  if (matchWithLevel) {
    return {
      id: `${index}`,
      date: matchWithLevel[1] ?? null,
      level: matchWithLevel[2] ?? "INFO",
      message: matchWithLevel[3] ?? "",
    };
  }
  const matchWithoutLevel = line.match(/^\[([^\]]+)\]\s+(.*)$/);
  if (matchWithoutLevel) {
    return {
      id: `${index}`,
      date: matchWithoutLevel[1] ?? null,
      level: "INFO",
      message: matchWithoutLevel[2] ?? "",
    };
  }

  return {
    id: `${index}`,
    date: null,
    level: "INFO",
    message: line,
  };
}

const SECURITY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "starttls", label: "STARTTLS" },
  { value: "ssl", label: "SSL/TLS" },
];

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

const UPDATE_PROGRESS_STEPS: Array<{ label: string; phases: string[] }> = [
  { label: "Downloading", phases: ["downloading"] },
  { label: "Extracting", phases: ["extracting"] },
  { label: "Backing up database", phases: ["backing_up"] },
  { label: "Applying update", phases: ["applying_files", "running_migrations"] },
];

function formatHumanDateTime(input: string | null): string {
  if (!input) return "-";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return input;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatByteCount(input: number | null | undefined): string {
  const bytes = Math.max(0, Number(input ?? 0));
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 100 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function isProtectedGroup(groupId: string): boolean {
  return groupId === "principals/groups/administrators";
}

export function AdminWorkspace(props: AdminWorkspaceProps) {
  const { data, session } = props;
  const logoutHref = props.logoutTo === false ? null : (props.logoutTo ?? data.logoutUrl ?? "/");
  const controller = useAdminController({ data, operations: props.operations });
  const sidebarItems = controller.sections.map((candidate) => ({
    label: candidate.label,
    icon: candidate.icon,
    selected: controller.section === candidate.id,
    onClick: () => controller.selectSection(candidate.id),
  }));
  const updateLogRows = useMemo(
    () =>
      controller.updateLogLines.map((line, index) => parseUpdateLogLine(line, index)).slice(-25),
    [controller.updateLogLines],
  );
  const groupMemberCount = useMemo(() => {
    const map = new Map<string, number>();
    controller.groups.forEach((group) => map.set(group.id, 0));
    controller.users.forEach((user) => {
      user.groups.forEach((groupId) => {
        map.set(groupId, (map.get(groupId) ?? 0) + 1);
      });
    });
    return map;
  }, [controller.groups, controller.users]);
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
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [confirmClearLogsOpen, setConfirmClearLogsOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [updatingNow, setUpdatingNow] = useState(false);
  const editingUser = controller.users.find((user) => user.id === editUserId) ?? null;
  const passwordUser = controller.users.find((user) => user.id === passwordUserId) ?? null;
  const deletingUser = controller.users.find((user) => user.id === deleteUserId) ?? null;
  const editingGroup = controller.groups.find((group) => group.id === editGroupId) ?? null;
  const deletingGroup = controller.groups.find((group) => group.id === deleteGroupId) ?? null;

  useEffect(() => {
    if (controller.updates.inProgress && confirmUpdateOpen) {
      setConfirmUpdateOpen(false);
      setUpdatingNow(false);
    }
  }, [controller.updates.inProgress, confirmUpdateOpen]);

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
  const logColumns: DataTableColumn<UpdateLogRow>[] = [
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
  ];

  return (
    <>
      <WorkspaceAppLayout
        className="admin-root"
        style={{
          ["--workspace-root-bg" as string]: "var(--color-cream, #f5f1e8)",
          ["--app-sidebar-bg" as string]: "#9bb6cc",
          ["--app-sidebar-border-color" as string]:
            "color-mix(in oklab, var(--color-ink) 15%, transparent)",
          ["--app-sidebar-color" as string]: "var(--color-ink)",
          ["--workspace-sidebar-toggle-color" as string]: "var(--color-ink)",
          ["--workspace-sidebar-toggle-bg" as string]:
            "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          ["--workspace-user-footer-text-color" as string]:
            "color-mix(in oklab, var(--color-ink) 80%, transparent)",
          ["--workspace-user-footer-border-color" as string]:
            "color-mix(in oklab, var(--color-ink) 18%, transparent)",
          ["--workspace-user-footer-avatar-bg" as string]:
            "color-mix(in oklab, var(--color-ink) 18%, transparent)",
          ["--workspace-user-footer-avatar-color" as string]: "var(--color-ink)",
          ["--workspace-user-footer-link-color" as string]: "var(--color-ink)",
          ["--workspace-user-footer-link-bg" as string]:
            "color-mix(in oklab, var(--color-ink) 10%, transparent)",
          ["--workspace-main-content-max-width" as string]: "64rem",
        }}
        sidebar={
          <AppSidebar
            open={controller.sidebarOpen}
            onCloseMobile={() => controller.setSidebarOpen(false)}
            footer={
              <WorkspaceUserFooter
                name={session.user.displayName}
                initials={workspaceUserInitials(session.user)}
                detailLine={session.user.username}
                onLogoutClick={() => {
                  if (logoutHref) window.location.assign(logoutHref);
                }}
                linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
              />
            }
          >
            <SidebarSection title="Administration" items={sidebarItems} />
          </AppSidebar>
        }
        mainHeader={
          <div className="flex items-center gap-3">
            <WorkspaceSidebarToggle
              open={controller.sidebarOpen}
              onToggle={() => controller.setSidebarOpen((value) => !value)}
              hoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
            />
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl md:text-3xl leading-none truncate"
                style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
              >
                {controller.currentSection.label}
              </h1>
              <p
                className="text-xs mt-1 truncate"
                style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
              >
                {controller.currentSection.description}
              </p>
            </div>
          </div>
        }
        main={
          <>
            {controller.section === "users" ? (
              <>
                <Card
                  title="Users"
                  action={
                    <IconActionButton label="New user" onClick={() => setNewUserOpen(true)}>
                      <Plus className="size-4" />
                    </IconActionButton>
                  }
                >
                  <ul
                    className="divide-y"
                    style={{
                      borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                    }}
                  >
                    {controller.users.map((user) => (
                      <li
                        key={user.id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        style={{
                          borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                        }}
                      >
                        <UserAvatar
                          displayName={user.displayName}
                          compact
                          size="sm"
                          className="shrink-0 gap-0 [--user-avatar-bg:var(--app-sidebar-bg)] [--user-avatar-fg:var(--app-sidebar-color)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{user.displayName}</div>
                          <div
                            className="text-xs truncate"
                            style={{
                              color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
                            }}
                          >
                            @{user.username} · {user.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <IconActionButton
                            label={`Edit ${user.displayName}`}
                            onClick={() => setEditUserId(user.id)}
                          >
                            <Pencil className="size-4" />
                          </IconActionButton>
                          <IconActionButton
                            label={`Set password for ${user.displayName}`}
                            onClick={() => setPasswordUserId(user.id)}
                          >
                            <KeyRound className="size-4" />
                          </IconActionButton>
                          <IconActionButton
                            label={`Delete ${user.displayName}`}
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="size-4" />
                          </IconActionButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card
                  title="Groups"
                  action={
                    <IconActionButton label="New group" onClick={() => setNewGroupOpen(true)}>
                      <Plus className="size-4" />
                    </IconActionButton>
                  }
                >
                  <ul
                    className="divide-y"
                    style={{
                      borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                    }}
                  >
                    {controller.groups.map((group) => (
                      <li
                        key={group.id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        style={{
                          borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                        }}
                      >
                        <div
                          className="size-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "var(--app-sidebar-bg)",
                            color: "var(--app-sidebar-color)",
                          }}
                        >
                          <UsersIcon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{group.displayName}</div>
                          <div
                            className="text-xs truncate"
                            style={{
                              color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
                            }}
                          >
                            {groupMemberCount.get(group.id) ?? 0} member
                            {(groupMemberCount.get(group.id) ?? 0) === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <IconActionButton
                            label={`Edit ${group.displayName}`}
                            onClick={() => setEditGroupId(group.id)}
                          >
                            <Pencil className="size-4" />
                          </IconActionButton>
                          {!isProtectedGroup(group.id) ? (
                            <IconActionButton
                              label={`Delete ${group.displayName}`}
                              onClick={() => setDeleteGroupId(group.id)}
                            >
                              <Trash2 className="size-4" />
                            </IconActionButton>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            ) : null}

            {controller.section === "mail" ? (
              <>
                <Card title="IMAP (incoming)">
                  <FormField label="Server">
                    <Input
                      value={controller.settingsForm.imapHost}
                      onChange={(event) =>
                        controller.setSettingsForm((prev) => ({
                          ...prev,
                          imapHost: event.currentTarget.value,
                        }))
                      }
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Port">
                      <Input
                        type="number"
                        value={String(controller.settingsForm.imapPort)}
                        onChange={(event) =>
                          controller.setSettingsForm((prev) => ({
                            ...prev,
                            imapPort: Number(event.currentTarget.value) || 0,
                          }))
                        }
                      />
                    </FormField>
                    <FormField label="Security">
                      <Select
                        value={controller.settingsForm.imapSecurity || "ssl"}
                        onValueChange={(value) =>
                          controller.setSettingsForm((prev) => ({ ...prev, imapSecurity: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECURITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </Card>
                <Card title="SMTP (outgoing)">
                  <FormField label="Server">
                    <Input
                      value={controller.settingsForm.smtpHost}
                      onChange={(event) =>
                        controller.setSettingsForm((prev) => ({
                          ...prev,
                          smtpHost: event.currentTarget.value,
                        }))
                      }
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Port">
                      <Input
                        type="number"
                        value={String(controller.settingsForm.smtpPort)}
                        onChange={(event) =>
                          controller.setSettingsForm((prev) => ({
                            ...prev,
                            smtpPort: Number(event.currentTarget.value) || 0,
                          }))
                        }
                      />
                    </FormField>
                    <FormField label="Security">
                      <Select
                        value={controller.settingsForm.smtpSecurity || "ssl"}
                        onValueChange={(value) =>
                          controller.setSettingsForm((prev) => ({ ...prev, smtpSecurity: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECURITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </Card>
                <div className="flex justify-end">
                  <Button
                    label="Save changes"
                    variant="primary"
                    onClick={controller.actions.saveSettings}
                    style={{ backgroundColor: "#2f302c", color: "#ffffff" }}
                  />
                </div>
              </>
            ) : null}

            {controller.section === "voice" ? (
              <>
                <Card title="ICE servers">
                  <FormField label="Signaling URL">
                    <Input
                      value={controller.settingsForm.signalingUrl}
                      onChange={(event) =>
                        controller.setSettingsForm((prev) => ({
                          ...prev,
                          signalingUrl: event.currentTarget.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="TURN URLs">
                    <Input
                      value={controller.settingsForm.turnUrls}
                      onChange={(event) =>
                        controller.setSettingsForm((prev) => ({
                          ...prev,
                          turnUrls: event.currentTarget.value,
                        }))
                      }
                    />
                  </FormField>
                  <div className="grid md:grid-cols-2 gap-3">
                    <FormField label="TURN username">
                      <Input
                        value={controller.settingsForm.turnUsername}
                        onChange={(event) =>
                          controller.setSettingsForm((prev) => ({
                            ...prev,
                            turnUsername: event.currentTarget.value,
                          }))
                        }
                      />
                    </FormField>
                    <FormField label="TURN password">
                      <Input
                        type="password"
                        value={controller.settingsForm.turnPassword}
                        onChange={(event) =>
                          controller.setSettingsForm((prev) => ({
                            ...prev,
                            turnPassword: event.currentTarget.value,
                          }))
                        }
                      />
                    </FormField>
                  </div>
                </Card>

                <Card title="Routing">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                        Force TURN relay for all calls
                      </div>
                      <div
                        className="text-xs"
                        style={{
                          color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
                        }}
                      >
                        Routes every call through the TURN server. Off by default.
                      </div>
                    </div>
                    <Switch
                      checked={controller.settingsForm.forceRelay}
                      onCheckedChange={(next) =>
                        controller.setSettingsForm((prev) => ({
                          ...prev,
                          forceRelay: Boolean(next),
                        }))
                      }
                    />
                  </div>
                </Card>
                <div className="flex justify-end">
                  <Button
                    label="Save changes"
                    variant="primary"
                    onClick={controller.actions.saveSettings}
                    style={{ backgroundColor: "#2f302c", color: "#ffffff" }}
                  />
                </div>
              </>
            ) : null}

            {controller.section === "webdav" ? (
              <>
                <Card title="Server defaults">
                  <FormField label="Default timezone">
                    <Select
                      value={controller.settingsForm.timezone}
                      onValueChange={(value) =>
                        controller.setSettingsForm((prev) => ({ ...prev, timezone: value }))
                      }
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
                  </FormField>
                  <FormField label="Auth realm">
                    <Input
                      value={controller.settingsForm.authRealm}
                      onChange={(event) =>
                        controller.setSettingsForm((prev) => ({
                          ...prev,
                          authRealm: event.currentTarget.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Base URI">
                    <Input
                      value={controller.settingsForm.baseUri}
                      onChange={(event) =>
                        controller.setSettingsForm((prev) => ({
                          ...prev,
                          baseUri: event.currentTarget.value,
                        }))
                      }
                    />
                  </FormField>
                </Card>

                <Card title="DAV features">
                  <FeatureRow
                    label="Files"
                    desc="Expose user files via WebDAV."
                    value={controller.settingsForm.sabreUi}
                    onChange={(next) =>
                      controller.setSettingsForm((prev) => ({ ...prev, sabreUi: next }))
                    }
                  />
                  <FeatureRow
                    label="Contacts"
                    desc="Enable CardDAV for address books."
                    value={controller.settingsForm.contacts}
                    onChange={(next) =>
                      controller.setSettingsForm((prev) => ({ ...prev, contacts: next }))
                    }
                  />
                  <FeatureRow
                    label="Calendars"
                    desc="Enable CalDAV for calendars and tasks."
                    value={controller.settingsForm.calendars}
                    onChange={(next) =>
                      controller.setSettingsForm((prev) => ({ ...prev, calendars: next }))
                    }
                  />
                </Card>
                <div className="flex justify-end">
                  <Button
                    label="Save changes"
                    variant="primary"
                    onClick={controller.actions.saveSettings}
                    style={{ backgroundColor: "#2f302c", color: "#ffffff" }}
                  />
                </div>
              </>
            ) : null}

            {controller.section === "backups" ? (
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
            ) : null}

            {controller.section === "updates" ? (
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
                            controller.updates.latest?.version ??
                            controller.updates.installedVersion ??
                            "-"
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
                                    isDone || isActive
                                      ? "var(--color-cream, #f5f1e8)"
                                      : "var(--color-ink)",
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
                        !controller.updates.updateAvailable ||
                        !controller.updates.compatible ||
                        updatingNow
                      }
                      style={{ backgroundColor: "#2f302c", color: "#ffffff" }}
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
                      onClick: controller.actions.checkUpdates,
                      disabled: controller.checkingUpdates,
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
            ) : null}
          </>
        }
      />

      <UserDialog
        open={newUserOpen}
        title="New user"
        onOpenChange={setNewUserOpen}
        onSubmit={async (payload) => {
          if (await controller.actions.createUser(payload)) {
            setNewUserOpen(false);
          }
        }}
      />
      <UserDialog
        open={Boolean(editingUser)}
        title="Edit user"
        initial={editingUser ?? undefined}
        onOpenChange={(next) => {
          if (!next) setEditUserId(null);
        }}
        onSubmit={async (payload) => {
          if (!editingUser) return;
          if (await controller.actions.updateUser(editingUser.id, payload)) {
            setEditUserId(null);
          }
        }}
      />
      <PasswordDialog
        open={Boolean(passwordUser)}
        user={passwordUser}
        onOpenChange={(next) => {
          if (!next) setPasswordUserId(null);
        }}
        onSubmit={async (values) => {
          if (!passwordUser) return;
          const ok = await controller.actions.updateUserPassword({
            userId: passwordUser.id,
            password: values.password,
            confirmPassword: values.confirmPassword,
          });
          if (ok) setPasswordUserId(null);
        }}
      />
      <GroupDialog
        open={newGroupOpen}
        title="New group"
        users={controller.users}
        currentUsername={data.currentUser || session.user.username || ""}
        onOpenChange={setNewGroupOpen}
        onSubmit={async (payload) => {
          if (await controller.actions.createGroup(payload.name)) {
            setNewGroupOpen(false);
          }
        }}
      />
      <GroupDialog
        open={Boolean(editingGroup)}
        title="Edit group"
        initial={editingGroup ?? undefined}
        users={controller.users}
        currentUsername={data.currentUser || session.user.username || ""}
        onOpenChange={(next) => {
          if (!next) setEditGroupId(null);
        }}
        onSubmit={async (payload) => {
          if (!editingGroup) return;
          const ok = await controller.actions.updateGroup(editingGroup.id, payload);
          if (ok) setEditGroupId(null);
        }}
      />

      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(next) => !next && setDeleteUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser
                ? `${deletingUser.displayName} (@${deletingUser.username}) will be permanently removed and unassigned from all groups.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingUser) return;
                if (await controller.actions.deleteUser(deletingUser.id)) {
                  setDeleteUserId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deletingGroup)}
        onOpenChange={(next) => !next && setDeleteGroupId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingGroup
                ? `“${deletingGroup.displayName}” will be removed. Members keep their accounts.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingGroup) return;
                if (await controller.actions.deleteGroup(deletingGroup.id)) {
                  setDeleteGroupId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClearLogsOpen} onOpenChange={setConfirmClearLogsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear update logs?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all current update log lines from the log panel. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await controller.actions.clearUpdateLog();
                setConfirmClearLogsOpen(false);
              }}
            >
              Clear logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUpdateOpen} onOpenChange={setConfirmUpdateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Update to ${controller.updates.latest?.version ?? "latest"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The server will create a pre-update backup and may restart. Active sessions could
              briefly disconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingNow}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updatingNow}
              onClick={async () => {
                setConfirmUpdateOpen(false);
                setUpdatingNow(true);
                try {
                  await controller.actions.applyUpdate();
                } finally {
                  setUpdatingNow(false);
                }
              }}
              style={{ backgroundColor: "#2f302c", color: "#ffffff" }}
            >
              {updatingNow ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update now"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function IconActionButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <IconButton
      label={label}
      icon={children}
      onClick={onClick}
      disabled={disabled}
      size="sm"
      variant="subtle"
      style={{ color: "var(--color-ink)" }}
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
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 border-t first:border-t-0"
      style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {label}
        </div>
        <div
          className="text-xs"
          style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
        >
          {desc}
        </div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

type UserDialogProps = {
  open: boolean;
  title: string;
  initial?: { username: string; displayName: string; email: string };
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { username: string; displayName: string; email: string }) => void;
};

function UserDialog({ open, title, initial, onOpenChange, onSubmit }: UserDialogProps) {
  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  useEffect(() => {
    if (!open) return;
    setUsername(initial?.username ?? "");
    setDisplayName(initial?.displayName ?? "");
    setEmail(initial?.email ?? "");
  }, [open, initial]);

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
          <FormField label="Username" readOnly={Boolean(initial)}>
            <Input
              value={username}
              readOnly={Boolean(initial)}
              onChange={(event) => setUsername(event.currentTarget.value)}
              placeholder="jane.doe"
            />
          </FormField>
          <FormField label="Display name">
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ username, displayName, email })}
            disabled={!username.trim() || !displayName.trim() || !email.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PasswordDialogProps = {
  open: boolean;
  user: { displayName: string } | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { password: string; confirmPassword: string }) => void;
};

function PasswordDialog({ open, user, onOpenChange, onSubmit }: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirmPassword("");
  }, [open, user?.displayName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>
            {user ? `Set a new password for ${user.displayName}.` : "Set a new password."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="New password">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </FormField>
          <FormField label="Confirm password">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ password, confirmPassword })}
            disabled={!password || !confirmPassword}
          >
            Update password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type GroupDialogProps = {
  open: boolean;
  title: string;
  initial?: { id: string; displayName: string };
  users: Array<{ id: string; displayName: string; username: string; groups: string[] }>;
  currentUsername: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name: string; memberUserIds: string[] }) => void;
};

function GroupDialog({
  open,
  title,
  initial,
  users,
  currentUsername,
  onOpenChange,
  onSubmit,
}: GroupDialogProps) {
  const [name, setName] = useState(initial?.displayName ?? "");
  const [memberUserIds, setMemberUserIds] = useState<string[]>(
    initial ? users.filter((user) => user.groups.includes(initial.id)).map((user) => user.id) : [],
  );
  useEffect(() => {
    if (!open) return;
    setName(initial?.displayName ?? "");
    setMemberUserIds(
      initial
        ? users.filter((user) => user.groups.includes(initial.id)).map((user) => user.id)
        : [],
    );
  }, [open, initial, users]);
  const toggleMember = (userId: string) =>
    setMemberUserIds((prev) =>
      prev.includes(userId) ? prev.filter((candidate) => candidate !== userId) : [...prev, userId],
    );

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
          <FormField label="Group name">
            <Input value={name} onChange={(event) => setName(event.currentTarget.value)} />
          </FormField>
          {initial ? (
            <FormField label="Members">
              <ul className="rounded-md border divide-y">
                {users.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 px-3 py-2">
                    <UserAvatar
                      displayName={user.displayName}
                      compact
                      size="sm"
                      className="shrink-0 gap-0 [--user-avatar-bg:var(--app-sidebar-bg)] [--user-avatar-fg:var(--app-sidebar-color)]"
                    />
                    <div className="flex-1 min-w-0 text-sm truncate">
                      {user.displayName}
                      <span
                        className="ml-2 text-xs"
                        style={{ color: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
                      >
                        @{user.username}
                      </span>
                    </div>
                    <Switch
                      checked={memberUserIds.includes(user.id)}
                      disabled={
                        initial?.id === "principals/groups/administrators" &&
                        user.username === currentUsername
                      }
                      onCheckedChange={() => toggleMember(user.id)}
                    />
                  </li>
                ))}
              </ul>
            </FormField>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit({ name, memberUserIds })} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

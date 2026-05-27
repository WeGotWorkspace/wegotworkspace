import { useEffect, useMemo, useRef, useState } from "react";
import { useAppToast } from "@/hooks/use-app-toast";
import type { AdminSection, AdminUpdateState } from "@/admin-core/src/admin-types";
import type { AdminWorkspaceProps } from "@/admin-core/src/admin-workspace-props";
import { useAdminSidebarModel } from "@/admin-core/src/use-admin-sidebar-model";

/** Keep the progress card visible during POST /apply while merging poll snapshots. */
function mergePendingApplyPoll(prev: AdminUpdateState, next: AdminUpdateState): AdminUpdateState {
  return {
    ...prev,
    ...next,
    inProgress: true,
    phase: next.phase ?? prev.phase ?? "downloading",
    current: next.current ?? prev.current,
    download: next.download ?? prev.download,
    phaseProgress: next.phaseProgress ?? prev.phaseProgress,
    cancelRequested: next.cancelRequested,
    cancelAllowed: next.cancelAllowed,
  };
}

type SettingsFormState = {
  imapHost: string;
  imapPort: number;
  imapSecurity: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: string;
  signalingUrl: string;
  stunUrls: string;
  turnUrls: string;
  turnUsername: string;
  turnPassword: string;
  forceRelay: boolean;
  calendars: boolean;
  contacts: boolean;
  sabreUi: boolean;
  timezone: string;
  baseUri: string;
  authRealm: string;
};

function buildSettingsFormState(data: AdminWorkspaceProps["data"]): SettingsFormState {
  const normalizeSecurity = (value: string): string => {
    const normalized = value.trim().toLowerCase();
    if (normalized === "ssl" || normalized === "ssl/tls") return "ssl";
    if (normalized === "starttls") return "starttls";
    return "none";
  };
  return {
    imapHost: data.mail.imapHost,
    imapPort: data.mail.imapPort,
    imapSecurity: normalizeSecurity(data.mail.imapSecurity),
    smtpHost: data.mail.smtpHost,
    smtpPort: data.mail.smtpPort,
    smtpSecurity: normalizeSecurity(data.mail.smtpSecurity),
    signalingUrl: data.voice.signalingUrl,
    stunUrls: data.voice.stunUrls,
    turnUrls: data.voice.turnUrls,
    turnUsername: data.voice.turnUsername,
    turnPassword: data.voice.turnPassword,
    forceRelay: data.voice.forceRelay,
    calendars: data.apps.calendars,
    contacts: data.apps.contacts,
    sabreUi: data.webdav.sabreUi,
    timezone: data.webdav.timezone,
    baseUri: data.webdav.baseUri,
    authRealm: data.webdav.authRealm,
  };
}

function combineVoiceIceUrls(stunUrls: string, turnUrls: string): string {
  const parts = [...stunUrls.split(/[\r\n,]+/), ...turnUrls.split(/[\r\n,]+/)]
    .map((piece) => piece.trim())
    .filter((piece) => piece !== "");

  return parts.join("\n");
}

function toSettingsMap(state: SettingsFormState): Record<string, string | number | boolean> {
  return {
    mail_imap_host: state.imapHost,
    mail_imap_port: state.imapPort,
    mail_imap_security: state.imapSecurity,
    mail_smtp_host: state.smtpHost,
    mail_smtp_port: state.smtpPort,
    mail_smtp_security: state.smtpSecurity,
    voice_signaling_url: state.signalingUrl,
    voice_turn_url: combineVoiceIceUrls(state.stunUrls, state.turnUrls),
    voice_turn_username: state.turnUsername,
    voice_turn_credential: state.turnPassword,
    voice_force_relay: state.forceRelay,
    calendar_enabled: state.calendars,
    contacts_enabled: state.contacts,
    browser_plugin: state.sabreUi,
    timezone: state.timezone,
    base_uri: state.baseUri,
    auth_realm: state.authRealm,
  };
}

export function useAdminController({
  data,
  operations,
}: Pick<AdminWorkspaceProps, "data" | "operations">) {
  const { showSuccess, showError } = useAppToast();
  const isProtectedGroupId = (groupId: string) => groupId === "principals/groups/administrators";
  const [section, setSection] = useState<AdminSection>("users");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState(data.users);
  const [groups, setGroups] = useState(data.groups);
  const [plugins, setPlugins] = useState(data.plugins);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(() =>
    buildSettingsFormState(data),
  );
  const [updates, setUpdates] = useState(data.updates);
  const [updateLogLines, setUpdateLogLines] = useState(data.updateLogLines);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [refreshingServerChecks, setRefreshingServerChecks] = useState(false);
  const applyRequestPendingRef = useRef(false);
  const sections = useAdminSidebarModel();

  useEffect(() => {
    setUsers(data.users);
    setGroups(data.groups);
    setPlugins(data.plugins);
    setUpdates(data.updates);
    setUpdateLogLines(data.updateLogLines);
  }, [data]);

  const applyAdminData = (next: AdminWorkspaceProps["data"]) => {
    setUsers(next.users);
    setGroups(next.groups);
    setPlugins(next.plugins);
    setSettingsForm(buildSettingsFormState(next));
    setUpdates(next.updates);
    setUpdateLogLines(next.updateLogLines);
  };

  useEffect(() => {
    const refreshProgress = operations?.refreshUpdateState;
    const refreshAll = operations?.refreshState;
    if (!refreshProgress && !refreshAll) return;
    let cancelled = false;
    let timeoutId: number | null = null;

    const poll = async () => {
      try {
        if (refreshProgress) {
          const nextUpdates = await refreshProgress();
          if (!cancelled) {
            setUpdates((prev) => {
              if (applyRequestPendingRef.current && !nextUpdates.inProgress) {
                return mergePendingApplyPoll(prev, nextUpdates);
              }
              return nextUpdates;
            });
          }
        } else if (refreshAll) {
          const next = await refreshAll();
          if (!cancelled) {
            setUpdates((prev) => {
              if (applyRequestPendingRef.current && !next.updates.inProgress) {
                return mergePendingApplyPoll(prev, next.updates);
              }
              return next.updates;
            });
            setUpdateLogLines(next.updateLogLines);
          }
        }
      } catch {
        // Keep showing existing progress if a poll fails temporarily.
      }
    };

    const schedulePoll = () => {
      if (cancelled) return;
      timeoutId = window.setTimeout(
        () => {
          void poll().finally(() => {
            schedulePoll();
          });
        },
        updates.inProgress ? 2000 : 4000,
      );
    };

    void poll().finally(() => {
      schedulePoll();
    });

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [updates.inProgress, operations?.refreshState, operations?.refreshUpdateState]);

  const currentSection = useMemo(
    () => sections.find((candidate) => candidate.id === section) ?? sections[0],
    [section, sections],
  );
  const selectSection = (nextSection: AdminSection) => {
    setSection(nextSection);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

  const saveSettings = async () => {
    if (!operations?.saveSettings) {
      showError("Admin API is not ready yet");
      return;
    }
    try {
      const next = await operations.saveSettings(toSettingsMap(settingsForm));
      setSettingsForm(buildSettingsFormState(next));
      setUpdates(next.updates);
      setUpdateLogLines(next.updateLogLines);
      showSuccess("Admin settings saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save admin settings";
      showError(message);
    }
  };

  const refresh = async () => {
    try {
      const next = await operations?.refreshState();
      if (!next) return;
      applyAdminData(next);
      showSuccess("Admin state refreshed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh admin state";
      showError(message);
    }
  };

  const checkUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const next = await operations?.checkUpdates();
      if (!next) return;
      setUpdates(next.updates);
      setUpdateLogLines(next.updateLogLines);
      showSuccess("Update check completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update check failed";
      showError(message);
    } finally {
      setCheckingUpdates(false);
    }
  };

  /** Re-fetch update state (including server checks) without running POST /updates/check. */
  const refreshServerChecks = async () => {
    setRefreshingServerChecks(true);
    try {
      const next = await operations?.refreshUpdateState();
      if (!next) return;
      setUpdates(next);
      showSuccess("Server checks refreshed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh server checks";
      showError(message);
    } finally {
      setRefreshingServerChecks(false);
    }
  };

  const clearUpdateLog = async () => {
    try {
      const lines = await operations?.clearUpdateLog();
      if (lines) setUpdateLogLines(lines);
      showSuccess("Update logs cleared");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not clear update logs";
      showError(message);
    }
  };

  const refreshUpdateLog = async () => {
    try {
      const lines = await operations?.refreshUpdateLog();
      if (lines) setUpdateLogLines(lines);
      showSuccess("Update logs refreshed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh update logs";
      showError(message);
    }
  };

  const downloadUpdateLog = async () => {
    try {
      const lines = (await operations?.refreshUpdateLog()) ?? updateLogLines;
      if (lines.length === 0) {
        showError("No update logs to download");
        return;
      }
      setUpdateLogLines(lines);
      const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `update-log-${new Date().toISOString().replace(/[:]/g, "-")}.log`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      showSuccess("Update log downloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not download update logs";
      showError(message);
    }
  };

  const deleteBackup = async (name: string) => {
    try {
      const next = await operations?.deleteBackup(name);
      if (!next) return;
      setUpdates(next.updates);
      setUpdateLogLines(next.updateLogLines);
      showSuccess("Backup deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete backup";
      showError(message);
    }
  };

  const createBackup = async () => {
    try {
      const next = await operations?.createBackup();
      if (!next) {
        showError("Manual backup creation endpoint is not available yet.");
        return;
      }
      setUpdates(next.updates);
      setUpdateLogLines(next.updateLogLines);
      showSuccess("Backup created");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create backup";
      showError(message);
    }
  };

  const downloadBackup = async (name: string) => {
    try {
      if (operations?.downloadBackup) {
        await operations.downloadBackup(name);
        return;
      }
      window.open(`/api/v1/admin/updates/backups/${encodeURIComponent(name)}`, "_blank");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not download backup";
      showError(message);
    }
  };

  const applyUpdate = async () => {
    applyRequestPendingRef.current = true;
    try {
      const wasInProgress = updates.inProgress;
      const requestedVersion = updates.latest?.version ?? updates.installedVersion;
      if (!wasInProgress) {
        const startedAt = new Date().toISOString();
        setUpdates((prev) => ({
          ...prev,
          inProgress: true,
          phase: prev.phase ?? "downloading",
          current:
            prev.current ??
            ({
              from: prev.installedVersion,
              to: requestedVersion,
              at: startedAt,
            } as NonNullable<typeof prev.current>),
          cancelRequested: false,
          lastResult: null,
        }));
      }
      const next = await operations?.applyUpdate(updates.latest?.version);
      if (!next) return;
      setUpdates(next);
      if (next.inProgress && !wasInProgress) {
        showSuccess("Update run started");
      } else if (next.inProgress && wasInProgress) {
        showSuccess("Update is already in progress");
      } else {
        showSuccess("Update request completed");
      }
    } catch (error) {
      try {
        const latest = await operations?.refreshUpdateState();
        if (latest) setUpdates(latest);
      } catch {
        setUpdates((prev) => ({
          ...prev,
          inProgress: false,
          phase: null,
          current: null,
          download: null,
          phaseProgress: null,
          cancelRequested: false,
          cancelAllowed: false,
        }));
      }
      const message = error instanceof Error ? error.message : "Could not apply update";
      showError(message);
    } finally {
      applyRequestPendingRef.current = false;
    }
  };

  const cancelUpdate = async () => {
    try {
      const next = await operations?.cancelUpdate();
      if (!next) return;
      setUpdates(next);
      showSuccess("Cancel requested");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not cancel update";
      showError(message);
    }
  };

  const createUser = async (input: { username: string; displayName: string; email: string }) => {
    const username = input.username.trim();
    if (!username) {
      showError("Username is required");
      return false;
    }
    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      showError("Username already exists");
      return false;
    }
    if (operations?.createUser) {
      try {
        const tempPassword = `Temp-${typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now()}`;
        const next = await operations.createUser({
          username,
          password: tempPassword,
          displayName: input.displayName.trim(),
          email: input.email.trim() || undefined,
          groups: [],
        });
        applyAdminData(next);
        showSuccess("User created");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not create user";
        showError(message);
        return false;
      }
    }
    setUsers((prev) => [
      ...prev,
      {
        id: username,
        username,
        displayName: input.displayName.trim(),
        email: input.email.trim(),
        groups: [],
        createdAt: new Date().toISOString(),
      },
    ]);
    showSuccess("User created");
    return true;
  };

  const updateUser = async (
    userId: string,
    input: { displayName: string; email: string; username?: string },
  ) => {
    if (operations?.updateUser) {
      try {
        const next = await operations.updateUser(input.username ?? userId, {
          displayName: input.displayName.trim(),
          email: input.email.trim() || "",
        });
        applyAdminData(next);
        showSuccess("User updated");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update user";
        showError(message);
        return false;
      }
    }
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              displayName: input.displayName.trim(),
              email: input.email.trim(),
            }
          : user,
      ),
    );
    showSuccess("User updated");
    return true;
  };

  const deleteUser = async (userId: string) => {
    if (operations?.deleteUser) {
      try {
        const next = await operations.deleteUser(userId);
        applyAdminData(next);
        showSuccess("User deleted");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not delete user";
        showError(message);
        return false;
      }
    }
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    showSuccess("User deleted");
    return true;
  };

  const updateUserPassword = async (input: {
    userId: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (input.password.length < 8) {
      showError("Password must be at least 8 characters");
      return false;
    }
    if (input.password !== input.confirmPassword) {
      showError("Passwords do not match");
      return false;
    }
    if (operations?.updateUser) {
      try {
        const next = await operations.updateUser(input.userId, { password: input.password });
        applyAdminData(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update password";
        showError(message);
        return false;
      }
    }
    showSuccess("Password updated");
    return true;
  };

  const createGroup = async (name: string) => {
    const value = name.trim();
    if (!value) {
      showError("Group name is required");
      return false;
    }
    const idToken = value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = `principals/groups/${idToken}`;
    if (
      groups.some((group) => group.id === id || group.name.toLowerCase() === value.toLowerCase())
    ) {
      showError("Group already exists");
      return false;
    }
    if (operations?.createGroup) {
      try {
        const next = await operations.createGroup({ name: value, displayName: value });
        applyAdminData(next);
        showSuccess("Group created");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not create group";
        showError(message);
        return false;
      }
    }
    setGroups((prev) => [...prev, { id, name: value, displayName: value }]);
    showSuccess("Group created");
    return true;
  };

  const updateGroup = async (groupId: string, input: { name: string; memberUserIds: string[] }) => {
    const value = input.name.trim();
    if (!value) {
      showError("Group name is required");
      return false;
    }
    if (operations?.updateGroup) {
      try {
        const selectedUsernames = users
          .filter((user) => input.memberUserIds.includes(user.id))
          .map((user) => user.username);
        const next = await operations.updateGroup(groupId, {
          displayName: value,
          members: selectedUsernames,
        });
        applyAdminData(next);
        showSuccess("Group saved");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update group";
        showError(message);
        return false;
      }
    }
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              name: value,
              displayName: value,
            }
          : group,
      ),
    );
    setUsers((prev) =>
      prev.map((user) => {
        const belongs = user.groups.includes(groupId);
        const shouldBelong = input.memberUserIds.includes(user.id);
        if (belongs === shouldBelong) return user;
        return {
          ...user,
          groups: shouldBelong
            ? [...user.groups, groupId]
            : user.groups.filter((candidate) => candidate !== groupId),
        };
      }),
    );
    showSuccess("Group saved");
    return true;
  };

  const deleteGroup = async (groupId: string) => {
    if (isProtectedGroupId(groupId)) {
      showError("The administrators group is protected and cannot be deleted.");
      return false;
    }
    if (operations?.deleteGroup) {
      try {
        const next = await operations.deleteGroup(groupId);
        applyAdminData(next);
        showSuccess("Group deleted");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not delete group";
        showError(message);
        return false;
      }
    }
    setGroups((prev) => prev.filter((group) => group.id !== groupId));
    setUsers((prev) =>
      prev.map((user) => ({
        ...user,
        groups: user.groups.filter((candidate) => candidate !== groupId),
      })),
    );
    showSuccess("Group deleted");
    return true;
  };

  const setPluginActive = async (pluginId: string, active: boolean) => {
    const operation = active ? operations?.activatePlugin : operations?.deactivatePlugin;
    if (!operation) {
      showError("Plugin API is not ready yet");
      return false;
    }
    try {
      const next = await operation(pluginId);
      applyAdminData(next);
      showSuccess(active ? "Plugin activated" : "Plugin deactivated");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update plugin state";
      showError(message);
      return false;
    }
  };

  return {
    section,
    sections,
    currentSection,
    sidebarOpen,
    setSidebarOpen,
    selectSection,
    users,
    groups,
    plugins,
    updates,
    updateLogLines,
    checkingUpdates,
    refreshingServerChecks,
    settingsForm,
    setSettingsForm,
    actions: {
      saveSettings,
      refresh,
      checkUpdates,
      refreshServerChecks,
      clearUpdateLog,
      refreshUpdateLog,
      downloadUpdateLog,
      deleteBackup,
      createBackup,
      downloadBackup,
      applyUpdate,
      cancelUpdate,
      createUser,
      updateUser,
      deleteUser,
      updateUserPassword,
      createGroup,
      updateGroup,
      deleteGroup,
      setPluginActive,
    },
  };
}

export type AdminControllerState = ReturnType<typeof useAdminController>;

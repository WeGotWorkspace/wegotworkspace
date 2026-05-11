import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { AdminSection } from "@/admin-core/src/admin-types";
import type { AdminWorkspaceProps } from "@/admin-core/src/admin-workspace-props";
import { useAdminSidebarModel } from "@/admin-core/src/use-admin-sidebar-model";

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

function toSettingsMap(state: SettingsFormState): Record<string, string | number | boolean> {
  return {
    mail_imap_host: state.imapHost,
    mail_imap_port: state.imapPort,
    mail_imap_security: state.imapSecurity,
    mail_smtp_host: state.smtpHost,
    mail_smtp_port: state.smtpPort,
    mail_smtp_security: state.smtpSecurity,
    voice_signaling_url: state.signalingUrl,
    voice_turn_url: state.turnUrls,
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
  const isProtectedGroupId = (groupId: string) => groupId === "principals/groups/administrators";
  const [section, setSection] = useState<AdminSection>("users");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState(data.users);
  const [groups, setGroups] = useState(data.groups);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(() =>
    buildSettingsFormState(data),
  );
  const [updates, setUpdates] = useState(data.updates);
  const [updateLogLines, setUpdateLogLines] = useState(data.updateLogLines);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const sections = useAdminSidebarModel();
  const applyAdminData = (next: AdminWorkspaceProps["data"]) => {
    setUsers(next.users);
    setGroups(next.groups);
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
            setUpdates(nextUpdates);
          }
        } else if (refreshAll) {
          const next = await refreshAll();
          if (!cancelled) {
            setUpdates(next.updates);
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
    try {
      const next = await operations?.saveSettings(toSettingsMap(settingsForm));
      if (next) {
        setSettingsForm(buildSettingsFormState(next));
        setUpdates(next.updates);
        setUpdateLogLines(next.updateLogLines);
      }
      toast("Admin settings saved", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save admin settings";
      toast.error(message);
    }
  };

  const refresh = async () => {
    try {
      const next = await operations?.refreshState();
      if (!next) return;
      applyAdminData(next);
      toast("Admin state refreshed", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh admin state";
      toast.error(message);
    }
  };

  const checkUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const next = await operations?.checkUpdates();
      if (!next) return;
      setUpdates(next.updates);
      setUpdateLogLines(next.updateLogLines);
      toast("Update check completed", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update check failed";
      toast.error(message);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const clearUpdateLog = async () => {
    try {
      const lines = await operations?.clearUpdateLog();
      if (lines) setUpdateLogLines(lines);
      toast("Update logs cleared", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not clear update logs";
      toast.error(message);
    }
  };

  const refreshUpdateLog = async () => {
    try {
      const lines = await operations?.refreshUpdateLog();
      if (lines) setUpdateLogLines(lines);
      toast("Update logs refreshed", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh update logs";
      toast.error(message);
    }
  };

  const downloadUpdateLog = async () => {
    try {
      const lines = (await operations?.refreshUpdateLog()) ?? updateLogLines;
      if (lines.length === 0) {
        toast.error("No update logs to download");
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
      toast("Update log downloaded", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not download update logs";
      toast.error(message);
    }
  };

  const deleteBackup = async (name: string) => {
    try {
      const next = await operations?.deleteBackup(name);
      if (!next) return;
      setUpdates(next.updates);
      setUpdateLogLines(next.updateLogLines);
      toast("Backup deleted", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete backup";
      toast.error(message);
    }
  };

  const createBackup = async () => {
    try {
      const next = await operations?.createBackup();
      if (!next) {
        toast.error("Manual backup creation endpoint is not available yet.");
        return;
      }
      setUpdates(next.updates);
      setUpdateLogLines(next.updateLogLines);
      toast("Backup created", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create backup";
      toast.error(message);
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
      toast.error(message);
    }
  };

  const applyUpdate = async () => {
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
        toast("Update run started", { icon: <Check className="size-4" /> });
      } else if (next.inProgress && wasInProgress) {
        toast("Update is already in progress", { icon: <Check className="size-4" /> });
      } else {
        toast("Update request completed", { icon: <Check className="size-4" /> });
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
      toast.error(message);
    }
  };

  const cancelUpdate = async () => {
    try {
      const next = await operations?.cancelUpdate();
      if (!next) return;
      setUpdates(next);
      toast("Cancel requested", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not cancel update";
      toast.error(message);
    }
  };

  const createUser = async (input: { username: string; displayName: string; email: string }) => {
    const username = input.username.trim();
    if (!username) {
      toast.error("Username is required");
      return false;
    }
    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      toast.error("Username already exists");
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
        toast("User created", { icon: <Check className="size-4" /> });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not create user";
        toast.error(message);
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
    toast("User created", { icon: <Check className="size-4" /> });
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
        toast("User updated", { icon: <Check className="size-4" /> });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update user";
        toast.error(message);
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
    toast("User updated", { icon: <Check className="size-4" /> });
    return true;
  };

  const deleteUser = async (userId: string) => {
    if (operations?.deleteUser) {
      try {
        const next = await operations.deleteUser(userId);
        applyAdminData(next);
        toast("User deleted", { icon: <Check className="size-4" /> });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not delete user";
        toast.error(message);
        return false;
      }
    }
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    toast("User deleted", { icon: <Check className="size-4" /> });
    return true;
  };

  const updateUserPassword = async (input: {
    userId: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (input.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    if (input.password !== input.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    if (operations?.updateUser) {
      try {
        const next = await operations.updateUser(input.userId, { password: input.password });
        applyAdminData(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update password";
        toast.error(message);
        return false;
      }
    }
    toast("Password updated", { icon: <Check className="size-4" /> });
    return true;
  };

  const createGroup = async (name: string) => {
    const value = name.trim();
    if (!value) {
      toast.error("Group name is required");
      return false;
    }
    const idToken = value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = `principals/groups/${idToken}`;
    if (
      groups.some((group) => group.id === id || group.name.toLowerCase() === value.toLowerCase())
    ) {
      toast.error("Group already exists");
      return false;
    }
    if (operations?.createGroup) {
      try {
        const next = await operations.createGroup({ name: value, displayName: value });
        applyAdminData(next);
        toast("Group created", { icon: <Check className="size-4" /> });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not create group";
        toast.error(message);
        return false;
      }
    }
    setGroups((prev) => [...prev, { id, name: value, displayName: value }]);
    toast("Group created", { icon: <Check className="size-4" /> });
    return true;
  };

  const updateGroup = async (groupId: string, input: { name: string; memberUserIds: string[] }) => {
    const value = input.name.trim();
    if (!value) {
      toast.error("Group name is required");
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
        toast("Group saved", { icon: <Check className="size-4" /> });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update group";
        toast.error(message);
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
    toast("Group saved", { icon: <Check className="size-4" /> });
    return true;
  };

  const deleteGroup = async (groupId: string) => {
    if (isProtectedGroupId(groupId)) {
      toast.error("The administrators group is protected and cannot be deleted.");
      return false;
    }
    if (operations?.deleteGroup) {
      try {
        const next = await operations.deleteGroup(groupId);
        applyAdminData(next);
        toast("Group deleted", { icon: <Check className="size-4" /> });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not delete group";
        toast.error(message);
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
    toast("Group deleted", { icon: <Check className="size-4" /> });
    return true;
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
    updates,
    updateLogLines,
    checkingUpdates,
    settingsForm,
    setSettingsForm,
    actions: {
      saveSettings,
      refresh,
      checkUpdates,
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
    },
  };
}

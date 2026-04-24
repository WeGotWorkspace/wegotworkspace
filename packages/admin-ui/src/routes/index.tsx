import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { useSettings, store, type User, type Group } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: UsersGroupsPage });

function UsersGroupsPage() {
  const s = useSettings();
  const [pendingAdminRemoval, setPendingAdminRemoval] = useState<{
    username: string;
    groupId: string;
    groupLabel: string;
  } | null>(null);
  const ADMIN_GROUP_URI = "principals/groups/administrators";

  const handleMembershipToggle = async (
    username: string,
    groupId: string,
    groupLabel: string,
    checked: boolean,
  ) => {
    if (!checked && groupId === ADMIN_GROUP_URI && username === s.currentUser) {
      toast.error("You cannot remove your own administrator access");
      return;
    }
    try {
      await store.toggleMembership(username, groupId, checked);
      toast.success(
        checked ? `Added ${username} to ${groupLabel}` : `Removed ${username} from ${groupLabel}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update membership");
    }
  };
  const requestMembershipToggle = (
    username: string,
    groupId: string,
    groupLabel: string,
    checked: boolean,
  ) => {
    if (!checked && groupId === ADMIN_GROUP_URI) {
      setPendingAdminRemoval({ username, groupId, groupLabel });
      return;
    }
    void handleMembershipToggle(username, groupId, groupLabel, checked);
  };

  return (
    <AdminShell>
      <div className="px-10 py-10 max-w-6xl">
        <PageHeader
          eyebrow="Identity"
          title="Users & Groups"
          description="Manage cloud accounts and access groups. Assign membership to control which apps and resources users can reach."
        />

        <Section
          title="Users"
          description="Local accounts that can sign in to this Nimbus instance."
          aside={
            <div className="font-mono text-[11px] text-muted-foreground">
              <span className="text-foreground">{s.users.length}</span> total ·{" "}
              <span className="text-success">{s.users.length}</span> active
            </div>
          }
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-muted-foreground">Showing all accounts</div>
            <UserDialog
              groups={s.groups}
              currentUser={s.currentUser}
              trigger={
                <Button size="sm">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  New user
                </Button>
              }
            />
          </div>
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Account</th>
                  <th className="text-left font-medium px-4 py-2.5">Email</th>
                  <th className="text-left font-medium px-4 py-2.5">Groups</th>
                  <th className="text-right font-medium px-4 py-2.5 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {s.users.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold">
                          {u.displayName
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="leading-tight">
                          <div className="font-medium">{u.displayName}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.groups.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">none</span>
                        )}
                        {u.groups.map((gid) => {
                          const g = s.groups.find((x) => x.id === gid);
                          return g ? (
                            <Badge key={gid} variant="secondary" className="font-normal">
                              {g.displayName}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <UserDialog
                          user={u}
                          groups={s.groups}
                          currentUser={s.currentUser}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <ConfirmDangerButton
                          title={`Delete ${u.username}?`}
                          description="This permanently removes the user account and related data."
                          confirmLabel="Delete user"
                          disabled={u.username === s.currentUser}
                          onConfirm={async () => {
                            if (u.username === s.currentUser) {
                              toast.error("You cannot remove your own account");
                              return;
                            }
                            try {
                              await store.removeUser(u.username);
                              toast.success("User removed");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Could not remove user");
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmDangerButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Groups"
          description="Logical containers for permissions. A user can belong to many groups."
          aside={
            <div className="font-mono text-[11px] text-muted-foreground">
              <span className="text-foreground">{s.groups.length}</span> groups defined
            </div>
          }
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-muted-foreground">All groups on this instance</div>
            <GroupDialog
              trigger={
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New group
                </Button>
              }
            />
          </div>
          <div className="grid gap-2">
            {s.groups.map((g) => {
              const memberCount = s.users.filter((u) => u.groups.includes(g.id)).length;
              const isAdministratorsGroup = g.id === ADMIN_GROUP_URI;
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-4 p-3 border border-border rounded-md hover:border-primary/30 transition-colors"
                >
                  <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center">
                    <UsersRound className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{g.displayName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {g.name} · {memberCount} member{memberCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <GroupDialog
                    group={g}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <ConfirmDangerButton
                    title={`Delete group ${g.displayName}?`}
                    description="This removes the group and clears its memberships."
                    confirmLabel="Delete group"
                    disabled={isAdministratorsGroup}
                    onConfirm={async () => {
                      if (isAdministratorsGroup) {
                        toast.error("The administrators group cannot be deleted");
                        return;
                      }
                      try {
                        await store.removeGroup(g.id);
                        toast.success("Group removed");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not remove group");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ConfirmDangerButton>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          title="Membership matrix"
          description="Toggle assignments between users and groups. Changes apply immediately."
        >
          {s.groups.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Create a group first to assign memberships.
            </div>
          ) : s.groups.length === 1 ? (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="grid grid-cols-[1fr_auto] bg-muted/50 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <div>User</div>
                <div className="text-center">{s.groups[0].displayName}</div>
              </div>
              {s.users.map((u) => (
                <div
                  key={u.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-border px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{u.displayName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">@{u.username}</div>
                  </div>
                  <div className="inline-flex items-center justify-center">
                    <Switch
                      checked={u.groups.includes(s.groups[0].id)}
                      disabled={
                        s.groups[0].id === ADMIN_GROUP_URI &&
                        u.username === s.currentUser &&
                        u.groups.includes(s.groups[0].id)
                      }
                      onCheckedChange={async (checked) => {
                        requestMembershipToggle(
                          u.username,
                          s.groups[0].id,
                          s.groups[0].displayName,
                          Boolean(checked),
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="w-[40%] bg-muted/50 px-4 py-2.5 text-left font-medium">User</th>
                    {s.groups.map((g) => (
                      <th
                        key={g.id}
                        className="whitespace-nowrap px-3 py-2.5 text-center font-medium"
                      >
                        {g.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="bg-surface px-4 py-2.5">
                        <div className="font-medium">{u.displayName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          @{u.username}
                        </div>
                      </td>
                      {s.groups.map((g) => (
                        <td key={g.id} className="px-3 py-2.5 text-center align-middle">
                          <div className="inline-flex items-center justify-center">
                            <Switch
                              checked={u.groups.includes(g.id)}
                              disabled={
                                g.id === ADMIN_GROUP_URI &&
                                u.username === s.currentUser &&
                                u.groups.includes(g.id)
                              }
                              onCheckedChange={async (checked) => {
                                requestMembershipToggle(
                                  u.username,
                                  g.id,
                                  g.displayName,
                                  Boolean(checked),
                                );
                              }}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
      <AlertDialog
        open={pendingAdminRemoval !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAdminRemoval(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove administrator access?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{pendingAdminRemoval?.username}</strong> from{" "}
              <strong>{pendingAdminRemoval?.groupLabel}</strong>. If no administrators remain, the
              admin app can become inaccessible until SQL recovery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingAdminRemoval) {
                  return;
                }
                const { username, groupId, groupLabel } = pendingAdminRemoval;
                setPendingAdminRemoval(null);
                void handleMembershipToggle(username, groupId, groupLabel, false);
              }}
            >
              Remove admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function UserDialog({
  user,
  groups,
  currentUser,
  trigger,
}: {
  user?: User;
  groups: Group[];
  currentUser: string;
  trigger: React.ReactNode;
}) {
  const ADMIN_GROUP_URI = "principals/groups/administrators";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
    displayName: user?.displayName ?? "",
    password: "",
    groups: user?.groups ?? [],
  });
  const submit = async () => {
    if (
      user?.username === currentUser &&
      user.username !== "" &&
      !form.groups.includes(ADMIN_GROUP_URI)
    ) {
      toast.error("You cannot remove your own administrator access");
      return;
    }
    try {
      if (user) {
        await store.updateUser({
          username: user.username,
          email: form.email,
          displayName: form.displayName,
          password: form.password,
          groups: form.groups,
        });
      } else {
        await store.addUser({
          username: form.username,
          email: form.email,
          displayName: form.displayName,
          password: form.password,
          groups: form.groups,
        });
      }
      toast.success(user ? "User updated" : "User created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save user");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{user ? "Edit user" : "Create user"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Username
            </Label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="font-mono"
              placeholder="jdoe"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="font-mono"
              placeholder="jdoe@nimbus.io"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Display name
            </Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {user ? "New password (leave blank to keep)" : "Password"}
            </Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="font-mono"
              placeholder="••••••••"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Groups</Label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const on = form.groups.includes(g.id);
                const lockSelfAdmin =
                  user?.username === currentUser && g.id === ADMIN_GROUP_URI && on;
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={lockSelfAdmin}
                    onClick={() =>
                      setForm({
                        ...form,
                        groups: on ? form.groups.filter((x) => x !== g.id) : [...form.groups, g.id],
                      })
                    }
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}
                  >
                    {g.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{user ? "Save changes" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupDialog({ group, trigger }: { group?: Group; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: group?.name ?? "",
    displayName: group?.displayName ?? "",
  });
  const submit = async () => {
    try {
      if (group) {
        await store.updateGroup(group.id, form.displayName);
      } else {
        await store.addGroup(form);
      }
      toast.success(group ? "Group updated" : "Group created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save group");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {group ? "Edit group" : "Create group"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Group name
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="font-mono"
              placeholder="editors"
              disabled={Boolean(group)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Display name
            </Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Content Editors"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{group ? "Save changes" : "Create group"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDangerButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  disabled,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:text-destructive"
          disabled={disabled}
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { KeyRound, Pencil, Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { Card } from "@/card/src/card";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { isProtectedGroup } from "@/admin-core/src/admin-workspace-utils";
import { IconActionButton } from "@/admin-core/src/admin-workspace-widgets";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

export type AdminUsersPaneProps = {
  controller: AdminControllerState;
  groupMemberCount: Map<string, number>;
  onNewUser: () => void;
  onEditUser: (userId: string) => void;
  onPasswordUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onNewGroup: () => void;
  onEditGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
};

export function AdminUsersPane({
  controller,
  groupMemberCount,
  onNewUser,
  onEditUser,
  onPasswordUser,
  onDeleteUser,
  onNewGroup,
  onEditGroup,
  onDeleteGroup,
}: AdminUsersPaneProps) {
  return (
    <>
      <Card
        title="Users"
        action={
          <IconActionButton label="New user" onClick={onNewUser}>
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
                  onClick={() => onEditUser(user.id)}
                >
                  <Pencil className="size-4" />
                </IconActionButton>
                <IconActionButton
                  label={`Set password for ${user.displayName}`}
                  onClick={() => onPasswordUser(user.id)}
                >
                  <KeyRound className="size-4" />
                </IconActionButton>
                <IconActionButton
                  label={`Delete ${user.displayName}`}
                  onClick={() => onDeleteUser(user.id)}
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
          <IconActionButton label="New group" onClick={onNewGroup}>
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
                  onClick={() => onEditGroup(group.id)}
                >
                  <Pencil className="size-4" />
                </IconActionButton>
                {!isProtectedGroup(group.id) ? (
                  <IconActionButton
                    label={`Delete ${group.displayName}`}
                    onClick={() => onDeleteGroup(group.id)}
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
  );
}

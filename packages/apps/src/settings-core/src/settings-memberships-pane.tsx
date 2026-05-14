import { Card } from "@/card/src/card";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import type { SettingsGroup } from "@/settings-core/src/settings-types";

export type SettingsMembershipsPaneProps = {
  groups: SettingsGroup[];
};

export function SettingsMembershipsPane({ groups }: SettingsMembershipsPaneProps) {
  return (
    <Card title="Groups">
      <ul className="settings-workspace__group-list">
        {groups.map((group) => (
          <li key={group.id} className="settings-workspace__group-row">
            <UserAvatar
              displayName={group.displayName}
              compact
              size="sm"
              className="settings-workspace__group-avatar shrink-0 gap-0"
            />
            <div className="min-w-0 flex-1">
              <div className="settings-workspace__group-name">{group.displayName}</div>
              <div className="settings-workspace__group-meta">{group.id}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

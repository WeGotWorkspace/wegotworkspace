import { useMemo } from "react";
import { createAdminAppBootstrap } from "@/lib/api/mock/admin-bootstrap";
import { createMockAdminOperations } from "@/admin-core/src/admin-mock-operations";
import type { AdminUIData } from "@/admin-core/src/admin-types";
import { useAdminController } from "@/admin-core/src/use-admin-controller";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

/** Story overrides: nested objects are partial (unlike `Partial<AdminUIData>`). */
export type AdminStoryDataOverride = {
  users?: AdminUIData["users"];
  groups?: AdminUIData["groups"];
  mail?: Partial<AdminUIData["mail"]>;
  rtc?: Partial<AdminUIData["rtc"]>;
  apps?: Partial<AdminUIData["apps"]>;
  webdav?: Partial<AdminUIData["webdav"]>;
  plugins?: AdminUIData["plugins"];
  updates?: Partial<AdminUIData["updates"]>;
  currentUser?: string;
  logoutUrl?: string;
  updateLogLines?: string[];
};

export function buildGroupMemberCountFromController(
  controller: Pick<AdminControllerState, "users" | "groups">,
): Map<string, number> {
  const map = new Map<string, number>();
  controller.groups.forEach((group) => map.set(group.id, 0));
  controller.users.forEach((user) => {
    user.groups.forEach((groupId) => {
      map.set(groupId, (map.get(groupId) ?? 0) + 1);
    });
  });
  return map;
}

function mergeAdminStoryData(base: AdminUIData, override?: AdminStoryDataOverride): AdminUIData {
  if (!override) return base;
  return {
    ...base,
    ...override,
    rtc: { ...base.rtc, ...override.rtc },
    mail: { ...base.mail, ...override.mail },
    apps: { ...base.apps, ...override.apps },
    webdav: { ...base.webdav, ...override.webdav },
    updates: { ...base.updates, ...override.updates },
  };
}

export function useAdminPaneStoryController(
  dataOverride?: AdminStoryDataOverride,
): AdminControllerState {
  const bootstrap = useMemo(() => {
    const base = createAdminAppBootstrap().data;
    const data = mergeAdminStoryData(base, dataOverride);
    return createAdminAppBootstrap({ data });
  }, [dataOverride]);

  const operations = useMemo(() => createMockAdminOperations(bootstrap.data), [bootstrap.data]);
  return useAdminController({ data: bootstrap.data, operations });
}

import { wgwFetch, wgwLiveApiEnabled, wgwReadJson } from "@/lib/api/wgw/http";
import type { WgwSettingsStateResponse } from "@/lib/api/wgw/types";

const ADMIN_GROUP_ID = "principals/groups/administrators";

export type WeGotWorkspaceHomeState = {
  showAdmin: boolean;
  userDisplayName: string;
  showUserMenu: boolean;
};

export const MOCK_HOME_STATE: WeGotWorkspaceHomeState = {
  showAdmin: true,
  userDisplayName: "Demo User",
  showUserMenu: true,
};

export async function fetchWeGotWorkspaceHomeState(): Promise<WeGotWorkspaceHomeState> {
  if (!wgwLiveApiEnabled()) {
    return MOCK_HOME_STATE;
  }

  try {
    const res = await wgwFetch("/settings/state");
    if (!res.ok) {
      return {
        showAdmin: false,
        userDisplayName: "User",
        showUserMenu: false,
      };
    }
    const state = (await wgwReadJson(res)) as WgwSettingsStateResponse;
    const userDisplayName = state.user.displayName?.trim() || state.user.username?.trim() || "User";
    const showUserMenu = Boolean(state.user.username?.trim() || state.user.email?.trim());
    return {
      showAdmin: state.groups.some((group) => group.id === ADMIN_GROUP_ID),
      userDisplayName,
      showUserMenu,
    };
  } catch {
    return {
      showAdmin: false,
      userDisplayName: "User",
      showUserMenu: false,
    };
  }
}

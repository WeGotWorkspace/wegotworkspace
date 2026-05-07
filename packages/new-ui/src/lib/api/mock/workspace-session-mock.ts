import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

/** Demo session for Storybook and mock-wired routes; swap for real `/me` data later. */
export const mockWorkspaceSession: WorkspaceSession = {
  user: {
    displayName: "",
    initials: "",
    username: undefined,
    email: undefined,
  },
  viewerInboxLabel: "me",
};

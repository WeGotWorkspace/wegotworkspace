import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

/** Demo session for Storybook and mock-wired routes; swap for real `/me` data later. */
export const mockWorkspaceSession: WorkspaceSession = {
  user: {
    displayName: "Elias Linden",
    initials: "EL",
    email: "elias@linden.studio",
  },
  viewerInboxLabel: "me",
};

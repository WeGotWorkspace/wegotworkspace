import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { MeetAppBootstrap, MeetUIData } from "@/meet-core/src/meet-types";
import { DEFAULT_PUBLIC_STUN_URLS_CSV } from "@/lib/rtc/default-stun";

const DEFAULT_DATA: MeetUIData = {
  defaultDisplayName: "Demo User",
  rtc: {
    stunUrls: DEFAULT_PUBLIC_STUN_URLS_CSV,
    turnUrls: "",
    turnUsername: "",
    turnPassword: "",
    forceRelay: false,
  },
};

const DEMO_SESSION: WorkspaceSession = {
  user: {
    displayName: "Demo User",
    initials: "DU",
    username: "demo.user",
    email: "demo@example.com",
  },
  viewerInboxLabel: "me",
};

export function createMeetAppBootstrap(overrides?: {
  data?: MeetUIData;
  session?: WorkspaceSession;
}): MeetAppBootstrap {
  return {
    data: overrides?.data ?? DEFAULT_DATA,
    session: overrides?.session ?? DEMO_SESSION,
  };
}

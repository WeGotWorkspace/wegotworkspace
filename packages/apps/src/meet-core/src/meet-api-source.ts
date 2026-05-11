import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { createWgwVoiceOperations, fetchVoiceLiveBootstrap } from "@/lib/api/wgw/voice";
import type { MeetAPIOperations, MeetAppBootstrap } from "@/meet-core/src/meet-types";

export type MeetApiSource = {
  loadBootstrap: () => Promise<MeetAppBootstrap>;
  createOperations: () => MeetAPIOperations | undefined;
};

export function createWgwMeetApiSource(): MeetApiSource {
  return {
    loadBootstrap: fetchVoiceLiveBootstrap,
    createOperations: () => createWgwVoiceOperations(),
  };
}

export function createDefaultMeetApiSource(): MeetApiSource {
  return createWorkspaceSource<MeetApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () =>
        Promise.resolve({
          session: mockWorkspaceSession,
          data: {
            defaultDisplayName: "Guest",
            rtc: {
              stunUrls: "",
              turnUrls: "",
              turnUsername: "",
              turnPassword: "",
              forceRelay: false,
            },
          },
        }),
      createOperations: () => undefined,
    }),
    createLiveSource: createWgwMeetApiSource,
  });
}

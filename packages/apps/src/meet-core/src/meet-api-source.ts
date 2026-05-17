import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import {
  createWgwVoiceGuestOperations,
  createWgwVoiceOperations,
  fetchVoiceGuestBootstrap,
  fetchVoiceLiveBootstrap,
} from "@/lib/api/wgw/voice";
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

export function createWgwMeetGuestApiSource(): MeetApiSource {
  return {
    loadBootstrap: fetchVoiceGuestBootstrap,
    createOperations: () => createWgwVoiceGuestOperations(),
  };
}

export function createDefaultMeetApiSource(): MeetApiSource {
  return createWorkspaceSource<MeetApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createMeetAppBootstrap()),
      createOperations: () => undefined,
    }),
    createLiveSource: createWgwMeetApiSource,
  });
}

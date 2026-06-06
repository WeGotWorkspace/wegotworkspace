import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import {
  createWgwMeetGuestOperations,
  createWgwMeetOperations,
  fetchMeetGuestBootstrap,
  fetchMeetLiveBootstrap,
} from "@/lib/api/wgw/meet";
import type { MeetAPIOperations, MeetAppBootstrap } from "@/meet-core/src/meet-types";

export type MeetApiSource = {
  loadBootstrap: () => Promise<MeetAppBootstrap>;
  createOperations: () => MeetAPIOperations | undefined;
};

export function createWgwMeetApiSource(): MeetApiSource {
  return {
    loadBootstrap: fetchMeetLiveBootstrap,
    createOperations: () => createWgwMeetOperations(),
  };
}

export function createWgwMeetGuestApiSource(): MeetApiSource {
  return {
    loadBootstrap: fetchMeetGuestBootstrap,
    createOperations: () => createWgwMeetGuestOperations(),
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

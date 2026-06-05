import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type {
  WgwVoiceChatRequest,
  WgwVoiceChatResponse,
  WgwVoiceJoinRequest,
  WgwVoiceJoinResponse,
  WgwVoiceLeaveRequest,
  WgwVoiceLeaveResponse,
  WgwVoicePollRequest,
  WgwVoicePollResponse,
  WgwVoiceRoomStatusRequest,
  WgwVoiceRoomStatusResponse,
  WgwVoiceSendRequest,
  WgwVoiceSendResponse,
} from "@/lib/api/wgw/types";

import type { RtcSettings } from "@/lib/rtc/types";

export type MeetRtcSettings = RtcSettings;

export type MeetUIData = {
  defaultDisplayName: string;
  rtc: MeetRtcSettings;
};

export type MeetAppBootstrap = {
  session: WorkspaceSession;
  data: MeetUIData;
};

export type MeetRequestOptions = {
  signal?: AbortSignal;
};

export type MeetAPIOperations = {
  roomStatus: (
    input: WgwVoiceRoomStatusRequest,
    opts?: MeetRequestOptions,
  ) => Promise<WgwVoiceRoomStatusResponse>;
  join: (input: WgwVoiceJoinRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceJoinResponse>;
  poll: (input: WgwVoicePollRequest, opts?: MeetRequestOptions) => Promise<WgwVoicePollResponse>;
  send: (input: WgwVoiceSendRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceSendResponse>;
  leave: (input: WgwVoiceLeaveRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceLeaveResponse>;
  chat: (input: WgwVoiceChatRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceChatResponse>;
};

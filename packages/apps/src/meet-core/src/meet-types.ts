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
  WgwVoiceSendRequest,
  WgwVoiceSendResponse,
} from "@/lib/api/wgw/types";

export type MeetRtcSettings = {
  stunUrls: string;
  turnUrls: string;
  turnUsername: string;
  turnPassword: string;
  forceRelay: boolean;
};

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
  join: (input: WgwVoiceJoinRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceJoinResponse>;
  poll: (input: WgwVoicePollRequest, opts?: MeetRequestOptions) => Promise<WgwVoicePollResponse>;
  send: (input: WgwVoiceSendRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceSendResponse>;
  leave: (input: WgwVoiceLeaveRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceLeaveResponse>;
  chat: (input: WgwVoiceChatRequest, opts?: MeetRequestOptions) => Promise<WgwVoiceChatResponse>;
};

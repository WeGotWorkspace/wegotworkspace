import { wgwApiBaseUrl, wgwFetch, wgwFetchPrincipal, wgwReadJson } from "@/lib/api/wgw/http";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import type {
  WgwAdminStateResponse,
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
import type {
  MeetAPIOperations,
  MeetAppBootstrap,
  MeetRequestOptions,
  MeetRtcSettings,
} from "@/meet-core/src/meet-types";

const DEFAULT_RTC_SETTINGS: MeetRtcSettings = {
  stunUrls: "",
  turnUrls: "",
  turnUsername: "",
  turnPassword: "",
  forceRelay: false,
};

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const payload = (await wgwReadJson(res)) as { error?: string; message?: string };
    const message = payload.error ?? payload.message;
    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  } catch {
    // Fall back to plain text body if JSON parsing fails.
  }
  try {
    const text = await res.text();
    if (text.trim() !== "") return text.trim();
  } catch {
    // Ignore body read failures.
  }
  return fallback;
}

async function postVoiceJson<T>(
  action: "room" | "join" | "poll" | "send" | "leave" | "chat",
  body: object,
  opts?: MeetRequestOptions,
): Promise<T> {
  const res = await wgwFetch(`/voice/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const fallback = `POST /voice/${action} failed (${res.status})`;
    throw new Error(await readApiError(res, fallback));
  }
  return (await wgwReadJson(res)) as T;
}

async function postVoiceJsonGuest<T>(
  action: "room" | "join" | "poll" | "send" | "leave" | "chat",
  body: object,
  opts?: MeetRequestOptions,
): Promise<T> {
  const base = wgwApiBaseUrl();
  const res = await fetch(`${base}/voice/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const fallback = `POST /voice/${action} failed (${res.status})`;
    throw new Error(await readApiError(res, fallback));
  }
  return (await wgwReadJson(res)) as T;
}

async function fetchRtcSettings(): Promise<MeetRtcSettings> {
  const res = await wgwFetch("/admin/state");
  if (!res.ok) return DEFAULT_RTC_SETTINGS;
  try {
    const payload = (await wgwReadJson(res)) as WgwAdminStateResponse;
    if (!payload.voice) return DEFAULT_RTC_SETTINGS;
    return {
      stunUrls: payload.voice.stunUrls ?? "",
      turnUrls: payload.voice.turnUrls ?? "",
      turnUsername: payload.voice.turnUsername ?? "",
      turnPassword: payload.voice.turnPassword ?? "",
      forceRelay: !!payload.voice.forceRelay,
    };
  } catch {
    return DEFAULT_RTC_SETTINGS;
  }
}

export async function fetchVoiceLiveBootstrap(): Promise<MeetAppBootstrap> {
  const [session, rtc] = await Promise.all([wgwFetchPrincipal(), fetchRtcSettings()]);
  return {
    session,
    data: {
      defaultDisplayName: session.user.displayName || session.user.username || "Guest",
      rtc,
    },
  };
}

export async function fetchVoiceGuestBootstrap(): Promise<MeetAppBootstrap> {
  return {
    session: {
      user: {
        displayName: "Guest",
        initials: workspaceUserInitials({ displayName: "Guest" }),
      },
      viewerInboxLabel: "guest",
    },
    data: {
      defaultDisplayName: "Guest",
      rtc: DEFAULT_RTC_SETTINGS,
    },
  };
}

export function createWgwVoiceOperations(): MeetAPIOperations {
  return {
    roomStatus: (input: { room: string }, opts?: MeetRequestOptions) =>
      postVoiceJson<{ active: boolean }>("room", input, opts),
    join: (input: WgwVoiceJoinRequest, opts?: MeetRequestOptions) =>
      postVoiceJson<WgwVoiceJoinResponse>("join", input, opts),
    poll: (input: WgwVoicePollRequest, opts?: MeetRequestOptions) =>
      postVoiceJson<WgwVoicePollResponse>("poll", input, opts),
    send: (input: WgwVoiceSendRequest, opts?: MeetRequestOptions) =>
      postVoiceJson<WgwVoiceSendResponse>("send", input, opts),
    leave: (input: WgwVoiceLeaveRequest, opts?: MeetRequestOptions) =>
      postVoiceJson<WgwVoiceLeaveResponse>("leave", input, opts),
    chat: (input: WgwVoiceChatRequest, opts?: MeetRequestOptions) =>
      postVoiceJson<WgwVoiceChatResponse>("chat", input, opts),
  };
}

export function createWgwVoiceGuestOperations(): MeetAPIOperations {
  return {
    roomStatus: (input: { room: string }, opts?: MeetRequestOptions) =>
      postVoiceJsonGuest<{ active: boolean }>("room", input, opts),
    join: (input: WgwVoiceJoinRequest, opts?: MeetRequestOptions) =>
      postVoiceJsonGuest<WgwVoiceJoinResponse>("join", input, opts),
    poll: (input: WgwVoicePollRequest, opts?: MeetRequestOptions) =>
      postVoiceJsonGuest<WgwVoicePollResponse>("poll", input, opts),
    send: (input: WgwVoiceSendRequest, opts?: MeetRequestOptions) =>
      postVoiceJsonGuest<WgwVoiceSendResponse>("send", input, opts),
    leave: (input: WgwVoiceLeaveRequest, opts?: MeetRequestOptions) =>
      postVoiceJsonGuest<WgwVoiceLeaveResponse>("leave", input, opts),
    chat: (input: WgwVoiceChatRequest, opts?: MeetRequestOptions) =>
      postVoiceJsonGuest<WgwVoiceChatResponse>("chat", input, opts),
  };
}

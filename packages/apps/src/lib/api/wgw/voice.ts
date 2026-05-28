import { wgwApiBaseUrl, wgwFetch, wgwFetchPrincipal, wgwReadJson } from "@/lib/api/wgw/http";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
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

const MEET_RTC_DEBUG_PARAM = "meetRtcDebug";

function isMeetRtcDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = new URLSearchParams(window.location.search).get(MEET_RTC_DEBUG_PARAM);
    if (!value) return false;
    return value === "1" || value.toLowerCase() === "true";
  } catch {
    return false;
  }
}

function logMeetRtcDebug(event: string, payload: Record<string, unknown>): void {
  if (!isMeetRtcDebugEnabled()) return;
  console.info(`[meet][rtc] ${event}`, payload);
}

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
  const base = wgwApiBaseUrl();
  const requestUrl = `${base}/voice/rtc`;
  logMeetRtcDebug("rtc-settings-request", { requestUrl });
  const res = await fetch(requestUrl, {
    cache: "no-store",
  });
  if (!res.ok) {
    logMeetRtcDebug("rtc-settings-response", {
      requestUrl,
      ok: false,
      status: res.status,
    });
    return DEFAULT_RTC_SETTINGS;
  }
  try {
    const payload = (await wgwReadJson(res)) as {
      voice?: Partial<MeetRtcSettings>;
      stunUrls?: string;
      turnUrls?: string;
      turnUsername?: string;
      turnPassword?: string;
      forceRelay?: boolean;
    };
    const voice = payload.voice ?? payload;
    const settings: MeetRtcSettings = {
      stunUrls: typeof voice.stunUrls === "string" ? voice.stunUrls : "",
      turnUrls: typeof voice.turnUrls === "string" ? voice.turnUrls : "",
      turnUsername: typeof voice.turnUsername === "string" ? voice.turnUsername : "",
      turnPassword: typeof voice.turnPassword === "string" ? voice.turnPassword : "",
      forceRelay: !!voice.forceRelay,
    };
    logMeetRtcDebug("rtc-settings-response", {
      requestUrl,
      ok: true,
      status: res.status,
      stunCount: settings.stunUrls
        .split(/[\n,\r]+/)
        .map((value) => value.trim())
        .filter((value) => value !== "").length,
      turnCount: settings.turnUrls
        .split(/[\n,\r]+/)
        .map((value) => value.trim())
        .filter((value) => value !== "").length,
      forceRelay: settings.forceRelay,
      turnUsernameConfigured: settings.turnUsername !== "",
      turnPasswordConfigured: settings.turnPassword !== "",
    });
    return settings;
  } catch {
    logMeetRtcDebug("rtc-settings-response", {
      requestUrl,
      ok: true,
      status: res.status,
      parseError: true,
    });
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

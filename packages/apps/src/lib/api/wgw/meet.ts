/**
 * Meet app HTTP client (`/api/v1/meet/*`, WebRTC audio + video).
 */
import { wgwApiBaseUrl, wgwFetch, wgwFetchPrincipal } from "@/lib/api/wgw/http";
import { fetchRtcSettings } from "@/lib/api/wgw/rtc";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import type {
  WgwMeetChatRequest,
  WgwMeetChatResponse,
  WgwMeetJoinRequest,
  WgwMeetJoinResponse,
  WgwMeetLeaveRequest,
  WgwMeetLeaveResponse,
  WgwMeetPollRequest,
  WgwMeetPollResponse,
  WgwMeetSendRequest,
  WgwMeetSendResponse,
} from "@/lib/api/wgw/types";
import type {
  MeetAPIOperations,
  MeetAppBootstrap,
  MeetRequestOptions,
} from "@/meet-core/src/meet-types";

const MEET_API_PREFIX = "/meet";

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const payload = (await res.json()) as { error?: string; message?: string };
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

async function postMeetJson<T>(
  action: "room" | "join" | "poll" | "send" | "leave" | "chat",
  body: object,
  opts?: MeetRequestOptions,
): Promise<T> {
  const res = await wgwFetch(`${MEET_API_PREFIX}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const fallback = `POST ${MEET_API_PREFIX}/${action} failed (${res.status})`;
    throw new Error(await readApiError(res, fallback));
  }
  return (await res.json()) as T;
}

async function postMeetJsonGuest<T>(
  action: "room" | "join" | "poll" | "send" | "leave" | "chat",
  body: object,
  opts?: MeetRequestOptions,
): Promise<T> {
  const base = wgwApiBaseUrl();
  const res = await fetch(`${base}${MEET_API_PREFIX}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const fallback = `POST ${MEET_API_PREFIX}/${action} failed (${res.status})`;
    throw new Error(await readApiError(res, fallback));
  }
  return (await res.json()) as T;
}

export async function fetchMeetLiveBootstrap(): Promise<MeetAppBootstrap> {
  const [session, rtc] = await Promise.all([wgwFetchPrincipal(), fetchRtcSettings()]);
  return {
    session,
    data: {
      defaultDisplayName: session.user.displayName || session.user.username || "Guest",
      rtc,
    },
  };
}

export async function fetchMeetGuestBootstrap(): Promise<MeetAppBootstrap> {
  const rtc = await fetchRtcSettings();
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
      rtc,
    },
  };
}

export function createWgwMeetOperations(): MeetAPIOperations {
  return {
    roomStatus: (input: { room: string }, opts?: MeetRequestOptions) =>
      postMeetJson<{ active: boolean }>("room", input, opts),
    join: (input: WgwMeetJoinRequest, opts?: MeetRequestOptions) =>
      postMeetJson<WgwMeetJoinResponse>("join", input, opts),
    poll: (input: WgwMeetPollRequest, opts?: MeetRequestOptions) =>
      postMeetJson<WgwMeetPollResponse>("poll", input, opts),
    send: (input: WgwMeetSendRequest, opts?: MeetRequestOptions) =>
      postMeetJson<WgwMeetSendResponse>("send", input, opts),
    leave: (input: WgwMeetLeaveRequest, opts?: MeetRequestOptions) =>
      postMeetJson<WgwMeetLeaveResponse>("leave", input, opts),
    chat: (input: WgwMeetChatRequest, opts?: MeetRequestOptions) =>
      postMeetJson<WgwMeetChatResponse>("chat", input, opts),
  };
}

export function createWgwMeetGuestOperations(): MeetAPIOperations {
  return {
    roomStatus: (input: { room: string }, opts?: MeetRequestOptions) =>
      postMeetJsonGuest<{ active: boolean }>("room", input, opts),
    join: (input: WgwMeetJoinRequest, opts?: MeetRequestOptions) =>
      postMeetJsonGuest<WgwMeetJoinResponse>("join", input, opts),
    poll: (input: WgwMeetPollRequest, opts?: MeetRequestOptions) =>
      postMeetJsonGuest<WgwMeetPollResponse>("poll", input, opts),
    send: (input: WgwMeetSendRequest, opts?: MeetRequestOptions) =>
      postMeetJsonGuest<WgwMeetSendResponse>("send", input, opts),
    leave: (input: WgwMeetLeaveRequest, opts?: MeetRequestOptions) =>
      postMeetJsonGuest<WgwMeetLeaveResponse>("leave", input, opts),
    chat: (input: WgwMeetChatRequest, opts?: MeetRequestOptions) =>
      postMeetJsonGuest<WgwMeetChatResponse>("chat", input, opts),
  };
}

export { fetchRtcSettings } from "@/lib/api/wgw/rtc";

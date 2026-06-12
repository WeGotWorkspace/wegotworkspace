/**
 * Meet app HTTP client (`/api/v1/meetings/rooms`, `/api/v1/rooms/{roomId}/*`).
 */
import { wgwApiBaseUrl, wgwFetch, wgwFetchPrincipal } from "@/lib/api/wgw/http";
import { fetchRtcSettings } from "@/lib/api/wgw/rtc";
import type { HttpSignalingFetch } from "@/lib/rtc/signaling/http-client";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import type {
  WgwMeetChatResponse,
  WgwMeetJoinResponse,
  WgwMeetLeaveResponse,
  WgwMeetPollRequest,
  WgwMeetPollResponse,
  WgwMeetSendResponse,
} from "@/lib/api/wgw/types";
import type { MeetAPIOperations, MeetAppBootstrap } from "@/meet-core/src/meet-types";

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

function roomPath(roomId: string, suffix: string): string {
  return `/rooms/${encodeURIComponent(roomId)}${suffix}`;
}

async function wgwMeetJson<T>(
  path: string,
  init: RequestInit,
  fallback: string,
  fetchImpl: typeof wgwFetch | HttpSignalingFetch = wgwFetch,
): Promise<T> {
  const res = await fetchImpl(path, init);
  if (!res.ok) {
    throw new Error(await readApiError(res, fallback));
  }
  return (await res.json()) as T;
}

async function guestFetch(path: string, init: RequestInit): Promise<Response> {
  const base = wgwApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${base}${normalized}`, init);
}

/** Unauthenticated fetch for guest meet signaling (join/poll/send/leave). */
export function createWgwMeetGuestSignalingFetch(): HttpSignalingFetch {
  return (url, init) => {
    const base = wgwApiBaseUrl();
    const path = url.startsWith(base) ? url.slice(base.length) : url;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return fetch(`${base}${normalized}`, init);
  };
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

function createMeetOperations(fetchImpl: typeof wgwFetch | HttpSignalingFetch): MeetAPIOperations {
  return {
    roomStatus: async (input, opts) => {
      const path = `/meetings/rooms/${encodeURIComponent(input.room)}`;
      return wgwMeetJson<{ active: boolean }>(
        path,
        { method: "GET", signal: opts?.signal },
        `GET ${path} failed`,
        fetchImpl,
      );
    },
    join: async (input, opts) =>
      wgwMeetJson<WgwMeetJoinResponse>(
        roomPath(input.room, "/participants"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: opts?.signal,
        },
        `POST ${roomPath(input.room, "/participants")} failed`,
        fetchImpl,
      ),
    poll: async (input, opts) => {
      const params = new URLSearchParams();
      params.set("peerId", input.peerId);
      const since = (input as WgwMeetPollRequest & { since?: number }).since;
      if (since !== undefined) params.set("since", String(since));
      if (input.sessionKey) params.set("sessionKey", input.sessionKey);
      const path = `${roomPath(input.room, "/events")}?${params.toString()}`;
      return wgwMeetJson<WgwMeetPollResponse>(
        path,
        { method: "GET", signal: opts?.signal },
        `GET ${path} failed`,
        fetchImpl,
      );
    },
    send: async (input, opts) =>
      wgwMeetJson<WgwMeetSendResponse>(
        roomPath(input.room, "/events"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: opts?.signal,
        },
        `POST ${roomPath(input.room, "/events")} failed`,
        fetchImpl,
      ),
    leave: async (input, opts) =>
      wgwMeetJson<WgwMeetLeaveResponse>(
        roomPath(input.room, `/participants/${encodeURIComponent(input.peerId)}`),
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: input.room,
            peerId: input.peerId,
            sessionKey: input.sessionKey,
          }),
          signal: opts?.signal,
        },
        `DELETE ${roomPath(input.room, `/participants/${input.peerId}`)} failed`,
        fetchImpl,
      ),
    chat: async (input, opts) =>
      wgwMeetJson<WgwMeetChatResponse>(
        roomPath(input.room, "/messages"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: opts?.signal,
        },
        `POST ${roomPath(input.room, "/messages")} failed`,
        fetchImpl,
      ),
  };
}

export function createWgwMeetOperations(): MeetAPIOperations {
  return createMeetOperations(wgwFetch);
}

export function createWgwMeetGuestOperations(): MeetAPIOperations {
  return {
    ...createMeetOperations(guestFetch),
    guestSignalingFetch: createWgwMeetGuestSignalingFetch,
  };
}

export { fetchRtcSettings } from "@/lib/api/wgw/rtc";

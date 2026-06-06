import type { SignalingChannel } from "@/lib/rtc/types";
import { rtcLog } from "@/lib/rtc/log";

export type HttpSignalingAuth = {
  bearerToken?: string;
  sessionKey?: string;
};

export type HttpSignalingJoinInput = {
  room: string;
  name: string;
  peerId?: string;
};

export type HttpSignalingJoinResult = {
  peerId?: string;
  sessionKey?: string | null;
  peers: Array<{ id: string; name: string }>;
};

export type HttpSignalingPollInput = {
  room: string;
  peerId: string;
  since?: number;
  sessionKey?: string;
};

export type HttpSignalingPollMessage = {
  id?: number;
  from: string;
  type: string;
  payload: unknown;
};

export type HttpSignalingPollResult = {
  peers: Array<{ id: string; name: string }>;
  messages: HttpSignalingPollMessage[];
};

export type HttpSignalingSendInput = {
  room: string;
  from: string;
  to: string;
  type: string;
  payload: unknown;
  sessionKey?: string;
};

export type HttpSignalingLeaveInput = {
  room: string;
  peerId: string;
  sessionKey?: string;
};

export type HttpSignalingFetch = (url: string, init: RequestInit) => Promise<Response>;

export type HttpSignalingClientOptions = {
  channel: SignalingChannel;
  apiBase: string;
  fetchImpl?: HttpSignalingFetch;
  getAuth?: () => HttpSignalingAuth;
  /** Collab API uses `peerId` instead of `from` on send. */
  sendFromField?: "from" | "peerId";
};

export class HttpSignalingClient {
  private readonly channel: SignalingChannel;

  private readonly apiBase: string;

  private readonly fetchImpl: HttpSignalingFetch;

  private readonly getAuth: () => HttpSignalingAuth;

  private readonly sendFromField: "from" | "peerId";

  constructor(options: HttpSignalingClientOptions) {
    this.channel = options.channel;
    this.apiBase = options.apiBase.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
    this.getAuth = options.getAuth ?? (() => ({}));
    this.sendFromField = options.sendFromField ?? "from";
  }

  private url(action: string): string {
    return `${this.apiBase}/${action}`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const { bearerToken } = this.getAuth();
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
    return headers;
  }

  private withSessionKey<T extends Record<string, unknown>>(body: T): T {
    const { sessionKey } = this.getAuth();
    if (!sessionKey) return body;
    return { ...body, sessionKey };
  }

  private async post<T>(action: string, body: Record<string, unknown>): Promise<T> {
    const requestUrl = this.url(action);
    rtcLog({ channel: this.channel }, "signal-request", { action, requestUrl });
    const res = await this.fetchImpl(requestUrl, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    rtcLog({ channel: this.channel }, "signal-response", {
      action,
      status: res.status,
      ok: res.ok,
      bytes: text.length,
    });
    if (text.startsWith("<?php") || text.trimStart().startsWith("<!")) {
      throw new Error("Signaling endpoint returned HTML instead of JSON.");
    }
    let data: { error?: string; message?: string };
    try {
      data = JSON.parse(text) as { error?: string; message?: string };
    } catch {
      throw new Error(`Invalid signaling response (${res.status}): ${text.slice(0, 80)}`);
    }
    if (!res.ok) {
      throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
    }
    return data as T;
  }

  join(input: HttpSignalingJoinInput): Promise<HttpSignalingJoinResult> {
    const body: Record<string, unknown> = {
      room: input.room,
      name: input.name,
    };
    if (input.peerId) body.peerId = input.peerId;
    return this.post<HttpSignalingJoinResult>("join", this.withSessionKey(body));
  }

  poll(input: HttpSignalingPollInput): Promise<HttpSignalingPollResult> {
    const body: Record<string, unknown> = {
      room: input.room,
      peerId: input.peerId,
    };
    if (input.since !== undefined) body.since = input.since;
    if (input.sessionKey) body.sessionKey = input.sessionKey;
    return this.post<HttpSignalingPollResult>("poll", this.withSessionKey(body));
  }

  send(input: HttpSignalingSendInput): Promise<unknown> {
    const body: Record<string, unknown> = {
      room: input.room,
      [this.sendFromField]: input.from,
      to: input.to,
      type: input.type,
      payload: input.payload,
    };
    if (input.sessionKey) body.sessionKey = input.sessionKey;
    return this.post("send", this.withSessionKey(body));
  }

  leave(input: HttpSignalingLeaveInput): Promise<unknown> {
    const body: Record<string, unknown> = {
      room: input.room,
      peerId: input.peerId,
    };
    if (input.sessionKey) body.sessionKey = input.sessionKey;
    return this.post("leave", this.withSessionKey(body));
  }
}

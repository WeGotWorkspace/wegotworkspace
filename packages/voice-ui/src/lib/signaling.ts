/**
 * Tiny client for Voice signaling.
 * Uses REST-style endpoints (/api/v1/voice/{action}).
 * Polls every 1.2s for new messages while the call is active.
 */

export type SignalType = "offer" | "answer" | "ice" | "bye" | "chat";

export interface PeerInfo {
  id: string;
  name: string;
}

export interface SignalMessage {
  from: string;
  type: SignalType;
  payload: unknown;
}

export interface PollResult {
  peers: PeerInfo[];
  messages: SignalMessage[];
}

interface JoinResult {
  peers: PeerInfo[];
  sessionKey?: string | null;
}

function actionEndpoint(url: string, action: string): string {
  const base = url.trim();
  if (!base) {
    return `/api/v1/voice/${encodeURIComponent(action)}`;
  }

  return `${base.replace(/\/+$/, "")}/${encodeURIComponent(action)}`;
}

async function call<T>(url: string, action: string, body: unknown): Promise<T> {
  const res = await fetch(actionEndpoint(url, action), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    let human = txt;
    try {
      const j = JSON.parse(txt) as { error?: string };
      if (j.error === "room_full") {
        human = "This room already has the maximum number of participants (4).";
      } else if (j.error) {
        human = j.error;
      }
    } catch {
      /* not JSON */
    }
    throw new Error(`Signaling ${action} failed: ${res.status} ${human}`);
  }
  return (await res.json()) as T;
}

function postDuringUnload(url: string, action: string, body: unknown): void {
  const endpoint = actionEndpoint(url, action);
  const payload = JSON.stringify(body);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(endpoint, blob)) {
      return;
    }
  }
  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* ignore - page is unloading */
  });
}

export class SignalingClient {
  private url: string;
  private room: string;
  private peerId: string;
  private name: string;
  private timer: number | null = null;
  private stopped = false;
  private onPoll: (r: PollResult) => void;
  private onError: (err: Error) => void;
  private sessionKey: string | null = null;

  constructor(opts: {
    url: string;
    room: string;
    peerId: string;
    name: string;
    onPoll: (r: PollResult) => void | Promise<void>;
    onError: (err: Error) => void;
  }) {
    this.url = opts.url;
    this.room = opts.room;
    this.peerId = opts.peerId;
    this.name = opts.name;
    this.onPoll = opts.onPoll;
    this.onError = opts.onError;
  }

  async join(): Promise<{ peers: PeerInfo[] }> {
    const res = await call<JoinResult>(this.url, "join", {
      room: this.room,
      peerId: this.peerId,
      name: this.name,
    });
    this.sessionKey =
      typeof res.sessionKey === "string" && res.sessionKey.trim() ? res.sessionKey : null;
    this.startPolling();
    return { peers: res.peers };
  }

  private startPolling() {
    const tick = async () => {
      if (this.stopped) return;
      try {
        const res = await call<PollResult>(this.url, "poll", {
          room: this.room,
          peerId: this.peerId,
          sessionKey: this.sessionKey,
        });
        await Promise.resolve(this.onPoll(res));
      } catch (e) {
        this.onError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!this.stopped) this.timer = window.setTimeout(tick, 1200);
      }
    };
    this.timer = window.setTimeout(tick, 200);
  }

  async send(to: string, type: Exclude<SignalType, "chat">, payload: unknown): Promise<void> {
    await call(this.url, "send", {
      room: this.room,
      from: this.peerId,
      to,
      type,
      payload,
      sessionKey: this.sessionKey,
    });
  }

  /** Broadcast text to every other peer in the room (via signaling relay). */
  async sendChat(text: string): Promise<void> {
    await call(this.url, "chat", {
      room: this.room,
      from: this.peerId,
      text,
      sessionKey: this.sessionKey,
    });
  }

  async leave(): Promise<void> {
    this.stopped = true;
    if (this.timer) window.clearTimeout(this.timer);
    try {
      await call(this.url, "leave", {
        room: this.room,
        peerId: this.peerId,
        sessionKey: this.sessionKey,
      });
    } catch {
      /* ignore — we're leaving anyway */
    }
  }

  leaveNow(): void {
    this.stopped = true;
    if (this.timer) window.clearTimeout(this.timer);
    postDuringUnload(this.url, "leave", {
      room: this.room,
      peerId: this.peerId,
      sessionKey: this.sessionKey,
    });
  }
}

/**
 * WebRTC mesh + HTTP signaling for docs collaboration.
 * Supports anonymous or bearer-authenticated signaling endpoints.
 */

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const DC_LABEL = "collab";
const POLL_MS = 2000;

export type DocsCollabMeshPeer = { id: string; name: string };

export type DocsCollabMeshMessage =
  | { type: "sync"; u: number[]; from?: string }
  | { type: "awareness"; u: number[]; from?: string }
  | { type: "dc-open"; from: string }
  | { type: "link" };

type MeshPeerEntry = {
  name: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  link: string;
  signalSent: boolean;
};

type PollMessage = {
  id: number;
  from: string;
  type: string;
  payload: unknown;
};

type MeshListener = (msg: DocsCollabMeshMessage) => void;

export type DocsCollabMeshOptions = {
  /** e.g. `/api/v1/collab/send` */
  signalUrl: string;
  /** Optional final API base (`/api/v1/collab`) using join/poll/send/leave endpoints. */
  collabApiBaseUrl?: string;
  /** Signaling room id (for parity endpoint isolation). */
  room?: string;
  /** Optional bearer token used for authenticated Laravel parity endpoint. */
  authToken?: string;
};

export class DocsCollabMesh {
  private myId: string | null = null;

  private myName = "";

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  private lastMsgId = 0;

  private lastRoomPeers: DocsCollabMeshPeer[] = [];

  private readonly mesh = new Map<string, MeshPeerEntry>();

  private readonly listeners = new Set<MeshListener>();

  constructor(
    private readonly signalUrl: string,
    private readonly room = "docs/test-together.md",
    private readonly authToken?: string,
    private readonly collabApiBaseUrl?: string,
  ) {}

  onMessage(listener: MeshListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getMyId(): string | null {
    return this.myId;
  }

  getMyName(): string {
    return this.myName;
  }

  getPeerIds(): string[] {
    return Array.from(this.mesh.keys());
  }

  getRoomPeers(): DocsCollabMeshPeer[] {
    return this.lastRoomPeers;
  }

  linkCount(): number {
    let n = 0;
    for (const entry of this.mesh.values()) {
      if (entry.dc?.readyState === "open") n += 1;
    }
    return n;
  }

  broadcast(msg: DocsCollabMeshMessage): void {
    const raw = JSON.stringify(msg);
    for (const entry of this.mesh.values()) {
      if (entry.dc?.readyState === "open") {
        try {
          entry.dc.send(raw);
        } catch {
          // ignore
        }
      }
    }
  }

  sendTo(remoteId: string, msg: DocsCollabMeshMessage): void {
    const entry = this.mesh.get(remoteId);
    if (entry?.dc?.readyState !== "open") return;
    try {
      entry.dc.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  private async api(action: string, body: Record<string, unknown> = {}): Promise<unknown> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.authToken) headers.Authorization = `Bearer ${this.authToken}`;
    const endpointActionMap: Record<string, string> = {
      join: "join",
      poll: "poll",
      signal: "send",
      leave: "leave",
    };
    const hasEndpointMode = Boolean(this.collabApiBaseUrl);
    const endpointAction = endpointActionMap[action];
    const collabBase = this.collabApiBaseUrl?.replace(/\/$/, "");
    const requestUrl =
      hasEndpointMode && endpointAction ? `${collabBase}/${endpointAction}` : this.signalUrl;
    const requestBody =
      hasEndpointMode && endpointAction
        ? JSON.stringify(body)
        : JSON.stringify({ action, ...body });

    const res = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: requestBody,
    });
    const text = await res.text();
    if (text.startsWith("<?php") || text.trimStart().startsWith("<!")) {
      throw new Error(
        "Signaling not running. Verify the docs collab signaling endpoint is available.",
      );
    }
    let data: { error?: string };
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      throw new Error(`Invalid response from signal.php (${res.status}): ${text.slice(0, 80)}`);
    }
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
    return data;
  }

  private linkState(pc: RTCPeerConnection): string {
    const s = pc.iceConnectionState;
    if (s === "connected" || s === "completed") return "connected";
    if (s === "checking" || s === "new") return "connecting";
    if (s === "failed") return "failed";
    if (s === "disconnected") return "disconnected";
    if (s === "closed") return "closed";
    return s;
  }

  private emit(msg: DocsCollabMeshMessage): void {
    for (const fn of this.listeners) fn(msg);
  }

  private sendSignal(to: string, type: string, payload: unknown): Promise<unknown> {
    return this.api("signal", { room: this.room, peerId: this.myId, to, type, payload });
  }

  private makePc(remoteId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = (e) => {
      if (e.candidate) void this.sendSignal(remoteId, "ice", e.candidate.toJSON());
    };
    pc.oniceconnectionstatechange = () => {
      const entry = this.mesh.get(remoteId);
      if (entry) {
        entry.link = this.linkState(pc);
        this.emit({ type: "link" });
      }
    };
    return pc;
  }

  private attachDataChannel(dc: RTCDataChannel, remoteId: string): void {
    const entry = this.mesh.get(remoteId);
    if (!entry) return;
    entry.dc = dc;
    dc.onopen = () => {
      entry.link = "connected";
      this.emit({ type: "dc-open", from: remoteId });
    };
    dc.onclose = () => {
      if (entry.dc === dc) entry.dc = null;
    };
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(String(e.data)) as DocsCollabMeshMessage;
        if (msg && typeof msg === "object") {
          this.emit({ ...msg, from: remoteId } as DocsCollabMeshMessage);
        }
      } catch {
        // ignore
      }
    };
  }

  private shouldReusePeerEntry(remoteId: string, initiator: boolean): boolean {
    const entry = this.mesh.get(remoteId);
    if (!entry) return false;
    if (entry.pc.connectionState === "failed" || entry.pc.iceConnectionState === "failed") {
      this.removePeer(remoteId);
      return false;
    }
    if (entry.dc?.readyState === "open") return true;
    if (!initiator) return true;
    if (entry.signalSent) return true;
    return false;
  }

  private async connectTo(remoteId: string, remoteName: string): Promise<void> {
    if (!this.myId) return;

    const initiator = this.myId < remoteId;
    if (this.shouldReusePeerEntry(remoteId, initiator)) return;

    if (this.mesh.has(remoteId)) this.removePeer(remoteId);

    const pc = this.makePc(remoteId);
    const entry: MeshPeerEntry = {
      name: remoteName,
      pc,
      dc: null,
      link: "connecting",
      signalSent: false,
    };
    this.mesh.set(remoteId, entry);

    if (initiator) {
      const dc = pc.createDataChannel(DC_LABEL);
      this.attachDataChannel(dc, remoteId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.sendSignal(remoteId, "offer", pc.localDescription);
      entry.signalSent = true;
    } else {
      pc.ondatachannel = (e) => {
        if (e.channel.label === DC_LABEL) this.attachDataChannel(e.channel, remoteId);
      };
    }
  }

  private removePeer(remoteId: string): void {
    const entry = this.mesh.get(remoteId);
    if (!entry) return;
    entry.dc?.close();
    entry.pc.close();
    this.mesh.delete(remoteId);
  }

  private sanitizeSdpForInterop(desc: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
    const sdp = typeof desc.sdp === "string" ? desc.sdp : "";
    if (!sdp.includes("a=max-message-size:")) return desc;
    const filtered = sdp
      .split(/\r?\n/)
      .filter((line) => !line.startsWith("a=max-message-size:"))
      .join("\r\n")
      .replace(/\r?\n?$/, "\r\n");
    return { ...desc, sdp: filtered };
  }

  private rewriteSctpPortToLegacy(desc: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
    const sdp = typeof desc.sdp === "string" ? desc.sdp : "";
    if (!sdp.includes("a=sctp-port:")) return desc;

    const lines = sdp.split(/\r?\n/);
    const out: string[] = [];
    let injectedSctpMap = false;

    for (const line of lines) {
      if (line.startsWith("a=sctp-port:")) {
        const port = line.split(":")[1] || "5000";
        out.push(`a=sctpmap:${port} webrtc-datachannel 1024`);
        injectedSctpMap = true;
        continue;
      }
      if (line.startsWith("m=application ") && line.includes(" webrtc-datachannel")) {
        // Legacy parsers expect the SCTP port in the m-line instead of "webrtc-datachannel".
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const maybePort = injectedSctpMap
            ? (out[out.length - 1]?.match(/^a=sctpmap:(\d+)/)?.[1] ?? "5000")
            : "5000";
          out.push(`m=application ${parts[1]} DTLS/SCTP ${maybePort}`);
          continue;
        }
      }
      out.push(line);
    }

    const rebuilt = out.join("\r\n").replace(/\r?\n?$/, "\r\n");
    return { ...desc, sdp: rebuilt };
  }

  private async safeSetRemoteDescription(
    pc: RTCPeerConnection,
    desc: RTCSessionDescriptionInit,
  ): Promise<void> {
    try {
      await pc.setRemoteDescription(desc);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("invalid sdp line")) throw error;
      const sanitized = this.sanitizeSdpForInterop(desc);
      if (sanitized.sdp !== desc.sdp) {
        try {
          await pc.setRemoteDescription(sanitized);
          return;
        } catch {
          // Continue to legacy fallback below.
        }
      }
      const legacy = this.rewriteSctpPortToLegacy(sanitized);
      if (legacy.sdp === desc.sdp) throw error;
      await pc.setRemoteDescription(legacy);
    }
  }

  private async handleOffer(from: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    let entry = this.mesh.get(from);
    if (!entry) {
      const pc = this.makePc(from);
      entry = { name: from.slice(0, 8), pc, dc: null, link: "connecting", signalSent: false };
      this.mesh.set(from, entry);
      pc.ondatachannel = (e) => {
        if (e.channel.label === DC_LABEL) this.attachDataChannel(e.channel, from);
      };
    }
    // Responder can get stuck in non-stable states after earlier failed attempts; rebuild and retry once.
    const applyOffer = async (): Promise<void> => {
      await this.safeSetRemoteDescription(entry!.pc, sdp);
      const answer = await entry!.pc.createAnswer();
      await entry!.pc.setLocalDescription(answer);
      await this.sendSignal(from, "answer", entry!.pc.localDescription);
      entry!.signalSent = true;
    };
    try {
      await applyOffer();
    } catch (error) {
      this.removePeer(from);
      const pc = this.makePc(from);
      entry = { name: from.slice(0, 8), pc, dc: null, link: "connecting", signalSent: false };
      this.mesh.set(from, entry);
      pc.ondatachannel = (e) => {
        if (e.channel.label === DC_LABEL) this.attachDataChannel(e.channel, from);
      };
      await applyOffer();
      console.warn("[docs-collab] recovered handleOffer after rebuild", error);
    }
  }

  private async handleAnswer(from: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const entry = this.mesh.get(from);
    if (!entry) return;
    await this.safeSetRemoteDescription(entry.pc, sdp);
  }

  private async handleIce(from: string, candidate: RTCIceCandidateInit): Promise<void> {
    const entry = this.mesh.get(from);
    if (!entry) return;
    try {
      await entry.pc.addIceCandidate(candidate);
    } catch {
      // can arrive before remote description
    }
  }

  private async onPoll({
    peers,
    messages,
  }: {
    peers: DocsCollabMeshPeer[];
    messages: PollMessage[];
  }): Promise<void> {
    const roomIds = new Set(peers.map((p) => p.id));

    for (const p of peers) {
      void this.connectTo(p.id, p.name).catch((err) => {
        console.warn("[docs-collab] connectTo failed", p.id, err);
      });
    }

    for (const id of [...this.mesh.keys()]) {
      if (!roomIds.has(id)) this.removePeer(id);
    }

    this.lastRoomPeers = peers;
    // Emit a lightweight tick so debug/presence UI updates even when there are no incoming messages.
    this.emit({ type: "link" });

    for (const m of messages) {
      this.lastMsgId = Math.max(this.lastMsgId, m.id);
      const entry = this.mesh.get(m.from);
      if (entry && m.type !== "ice") {
        entry.name = peers.find((p) => p.id === m.from)?.name ?? entry.name;
      }

      try {
        if (m.type === "offer") {
          await this.handleOffer(m.from, m.payload as RTCSessionDescriptionInit);
        } else if (m.type === "answer") {
          await this.handleAnswer(m.from, m.payload as RTCSessionDescriptionInit);
        } else if (m.type === "ice") {
          await this.handleIce(m.from, m.payload as RTCIceCandidateInit);
        }
      } catch (error) {
        console.warn("[docs-collab] onPoll message handling failed", m.type, error);
      }
    }
  }

  private async pollOnce(): Promise<void> {
    if (!this.myId) return;
    const data = (await this.api("poll", {
      room: this.room,
      peerId: this.myId,
      since: this.lastMsgId,
    })) as { peers: DocsCollabMeshPeer[]; messages: PollMessage[] };
    await this.onPoll(data);
  }

  private schedulePoll(): void {
    if (!this.myId) return;
    this.pollTimer = setTimeout(() => {
      void this.pollOnce()
        .catch((err) => {
          this.emit({ type: "link" });
          console.warn("[docs-collab] poll failed", err);
        })
        .finally(() => this.schedulePoll());
    }, POLL_MS);
  }

  async join(name: string): Promise<{ peerId: string; peers: DocsCollabMeshPeer[] }> {
    this.myName = name.trim();
    if (!this.myName) throw new Error("Enter a display name");
    const data = (await this.api("join", { room: this.room, name: this.myName })) as {
      peerId: string;
      peers: DocsCollabMeshPeer[];
    };
    this.myId = data.peerId;
    this.schedulePoll();
    void this.onPoll({ peers: data.peers, messages: [] }).catch((err) => {
      console.warn("[docs-collab] initial onPoll failed", err);
    });
    return { peerId: data.peerId, peers: data.peers };
  }

  async leave(): Promise<void> {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.myId) {
      try {
        await this.api("leave", { room: this.room, peerId: this.myId });
      } catch {
        // ignore
      }
    }
    for (const id of [...this.mesh.keys()]) this.removePeer(id);
    this.myId = null;
    this.myName = "";
    this.lastMsgId = 0;
  }
}

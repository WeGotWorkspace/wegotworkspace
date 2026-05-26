/**
 * WebRTC mesh + HTTP signaling (parity with laatste-test/mesh.js).
 * Anonymous peers via laatste-test/signal.php — no WGW auth.
 */

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const DC_LABEL = "collab";
const POLL_MS = 2000;

export type LaatsteTestMeshPeer = { id: string; name: string };

export type LaatsteTestMeshMessage =
  | { type: "sync"; u: number[]; from?: string }
  | { type: "awareness"; u: number[]; from?: string }
  | { type: "dc-open"; from: string }
  | { type: "link" };

type MeshPeerEntry = {
  name: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  link: string;
};

type PollMessage = {
  id: number;
  from: string;
  type: string;
  payload: unknown;
};

type MeshListener = (msg: LaatsteTestMeshMessage) => void;

export type LaatsteTestMeshOptions = {
  /** e.g. `/laatste-test/signal.php` (Storybook proxy → PHP on :8081) */
  signalUrl: string;
};

export class LaatsteTestMesh {
  private myId: string | null = null;

  private myName = "";

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  private lastMsgId = 0;

  private lastRoomPeers: LaatsteTestMeshPeer[] = [];

  private readonly mesh = new Map<string, MeshPeerEntry>();

  private readonly listeners = new Set<MeshListener>();

  constructor(private readonly signalUrl: string) {}

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

  getRoomPeers(): LaatsteTestMeshPeer[] {
    return this.lastRoomPeers;
  }

  linkCount(): number {
    let n = 0;
    for (const entry of this.mesh.values()) {
      if (entry.dc?.readyState === "open") n += 1;
    }
    return n;
  }

  broadcast(msg: LaatsteTestMeshMessage): void {
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

  sendTo(remoteId: string, msg: LaatsteTestMeshMessage): void {
    const entry = this.mesh.get(remoteId);
    if (entry?.dc?.readyState !== "open") return;
    try {
      entry.dc.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  private async api(action: string, body: Record<string, unknown> = {}): Promise<unknown> {
    const res = await fetch(this.signalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const text = await res.text();
    if (text.startsWith("<?php") || text.trimStart().startsWith("<!")) {
      throw new Error(
        "Signaling not running. Start `pnpm dev:laatste-test-signal` or Storybook (starts PHP on :8081).",
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

  private emit(msg: LaatsteTestMeshMessage): void {
    for (const fn of this.listeners) fn(msg);
  }

  private sendSignal(to: string, type: string, payload: unknown): Promise<unknown> {
    return this.api("signal", { peerId: this.myId, to, type, payload });
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
        const msg = JSON.parse(String(e.data)) as LaatsteTestMeshMessage;
        if (msg && typeof msg === "object") {
          this.emit({ ...msg, from: remoteId } as LaatsteTestMeshMessage);
        }
      } catch {
        // ignore
      }
    };
  }

  private async connectTo(remoteId: string, remoteName: string): Promise<void> {
    if (this.mesh.has(remoteId) || !this.myId) return;

    const pc = this.makePc(remoteId);
    this.mesh.set(remoteId, { name: remoteName, pc, dc: null, link: "connecting" });

    const initiator = this.myId < remoteId;
    if (initiator) {
      const dc = pc.createDataChannel(DC_LABEL);
      this.attachDataChannel(dc, remoteId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.sendSignal(remoteId, "offer", pc.localDescription);
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

  private async handleOffer(from: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    let entry = this.mesh.get(from);
    if (!entry) {
      const pc = this.makePc(from);
      entry = { name: from.slice(0, 8), pc, dc: null, link: "connecting" };
      this.mesh.set(from, entry);
      pc.ondatachannel = (e) => {
        if (e.channel.label === DC_LABEL) this.attachDataChannel(e.channel, from);
      };
    }
    await entry.pc.setRemoteDescription(sdp);
    const answer = await entry.pc.createAnswer();
    await entry.pc.setLocalDescription(answer);
    await this.sendSignal(from, "answer", entry.pc.localDescription);
  }

  private async handleAnswer(from: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const entry = this.mesh.get(from);
    if (!entry) return;
    await entry.pc.setRemoteDescription(sdp);
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
    peers: LaatsteTestMeshPeer[];
    messages: PollMessage[];
  }): Promise<void> {
    const roomIds = new Set(peers.map((p) => p.id));

    for (const p of peers) {
      await this.connectTo(p.id, p.name);
    }

    for (const id of [...this.mesh.keys()]) {
      if (!roomIds.has(id)) this.removePeer(id);
    }

    this.lastRoomPeers = peers;

    for (const m of messages) {
      this.lastMsgId = Math.max(this.lastMsgId, m.id);
      const entry = this.mesh.get(m.from);
      if (entry && m.type !== "ice") {
        entry.name = peers.find((p) => p.id === m.from)?.name ?? entry.name;
      }

      if (m.type === "offer") {
        await this.handleOffer(m.from, m.payload as RTCSessionDescriptionInit);
      } else if (m.type === "answer") {
        await this.handleAnswer(m.from, m.payload as RTCSessionDescriptionInit);
      } else if (m.type === "ice") {
        await this.handleIce(m.from, m.payload as RTCIceCandidateInit);
      }
    }
  }

  private async pollOnce(): Promise<void> {
    if (!this.myId) return;
    const data = (await this.api("poll", {
      peerId: this.myId,
      since: this.lastMsgId,
    })) as { peers: LaatsteTestMeshPeer[]; messages: PollMessage[] };
    await this.onPoll(data);
  }

  private schedulePoll(): void {
    if (!this.myId) return;
    this.pollTimer = setTimeout(() => {
      void this.pollOnce()
        .catch((err) => {
          this.emit({ type: "link" });
          console.warn("[laatste-test-collab] poll failed", err);
        })
        .finally(() => this.schedulePoll());
    }, POLL_MS);
  }

  async join(name: string): Promise<{ peerId: string; peers: LaatsteTestMeshPeer[] }> {
    this.myName = name.trim();
    if (!this.myName) throw new Error("Enter a display name");
    const data = (await this.api("join", { name: this.myName })) as {
      peerId: string;
      peers: LaatsteTestMeshPeer[];
    };
    this.myId = data.peerId;
    await this.onPoll({ peers: data.peers, messages: [] });
    this.schedulePoll();
    return { peerId: data.peerId, peers: data.peers };
  }

  async leave(): Promise<void> {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.myId) {
      try {
        await this.api("leave", { peerId: this.myId });
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

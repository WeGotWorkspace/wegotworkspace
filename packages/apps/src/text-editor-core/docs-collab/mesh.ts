/**
 * WebRTC mesh + HTTP signaling for docs collaboration.
 * Supports anonymous or bearer-authenticated signaling endpoints.
 */

const DC_LABEL = "collab";
const POLL_MS = 2000;

export type DocsCollabMeshPeer = { id: string; name: string };
export type DocsCollabPeerLinkState =
  | "connected"
  | "connecting"
  | "failed"
  | "disconnected"
  | "closed";
export type DocsCollabMeshPeerStatus = DocsCollabMeshPeer & { link: DocsCollabPeerLinkState };

export type DocsCollabRtcSettings = {
  stunUrls: string;
  turnUrls: string;
  turnUsername: string;
  turnPassword: string;
  forceRelay: boolean;
};

export type DocsCollabMeshMessage =
  | { type: "sync"; u: number[]; from?: string }
  | { type: "awareness"; u: number[]; from?: string }
  | { type: "dc-open"; from: string }
  | { type: "link" };

type MeshPeerEntry = {
  name: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  link: DocsCollabPeerLinkState;
  signalSent: boolean;
  mode: "direct" | "relay";
  relayFallbackTried: boolean;
  initiator: boolean;
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
  rtcSettings?: DocsCollabRtcSettings;
  debugRtc?: boolean;
};

const DEFAULT_DOCS_COLLAB_RTC_SETTINGS: DocsCollabRtcSettings = {
  stunUrls: "",
  turnUrls: "",
  turnUsername: "",
  turnPassword: "",
  forceRelay: false,
};

function normalizeIceUrl(raw: string, defaultScheme: "stun" | "turn"): string {
  const value = raw.trim();
  if (value === "") return "";
  if (/^(stun|stuns|turn|turns):/i.test(value)) return value;
  return `${defaultScheme}:${value}`;
}

function parseUrlList(raw: string, defaultScheme: "stun" | "turn"): string[] {
  return raw
    .split(/[\n,\r]+/)
    .map((value) => normalizeIceUrl(value, defaultScheme))
    .filter((value) => value !== "");
}

function toRtcConfig(settings: DocsCollabRtcSettings, mode: "direct" | "relay"): RTCConfiguration {
  const turnUrls = parseUrlList(settings.turnUrls, "turn");
  const stunUrls = parseUrlList(settings.stunUrls, "stun");
  const forceRelay = (settings.forceRelay || mode === "relay") && turnUrls.length > 0;
  const iceServers: RTCIceServer[] = [];

  if (forceRelay) {
    iceServers.push({
      urls: turnUrls,
      username: settings.turnUsername || undefined,
      credential: settings.turnPassword || undefined,
    });
  } else {
    if (stunUrls.length > 0) {
      iceServers.push({ urls: [...new Set(stunUrls)] });
    }
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: [...new Set(turnUrls)],
        username: settings.turnUsername || undefined,
        credential: settings.turnPassword || undefined,
      });
    }
  }

  return {
    iceServers,
    iceTransportPolicy: forceRelay ? "relay" : "all",
    iceCandidatePoolSize: forceRelay ? 0 : 2,
  };
}

export class DocsCollabMesh {
  private myId: string | null = null;

  private myName = "";

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  private lastMsgId = 0;

  private lastRoomPeers: DocsCollabMeshPeer[] = [];

  private readonly mesh = new Map<string, MeshPeerEntry>();

  private readonly listeners = new Set<MeshListener>();

  private readonly rtcSettings: DocsCollabRtcSettings;

  private readonly turnConfigured: boolean;

  private readonly debugRtc: boolean;

  constructor(
    private readonly signalUrl: string,
    private readonly room = "docs/test-together.md",
    private readonly authToken?: string,
    private readonly collabApiBaseUrl?: string,
    rtcSettings?: DocsCollabRtcSettings,
    debugRtc = false,
  ) {
    this.rtcSettings = rtcSettings
      ? {
          ...DEFAULT_DOCS_COLLAB_RTC_SETTINGS,
          ...rtcSettings,
        }
      : DEFAULT_DOCS_COLLAB_RTC_SETTINGS;
    this.turnConfigured = parseUrlList(this.rtcSettings.turnUrls, "turn").length > 0;
    this.debugRtc = debugRtc;
    this.debug("mesh-init", {
      room: this.room,
      signalUrl: this.signalUrl,
      collabApiBaseUrl: this.collabApiBaseUrl,
      turnConfigured: this.turnConfigured,
      rtcSettings: {
        ...this.rtcSettings,
        turnPassword: this.rtcSettings.turnPassword ? "***" : "",
      },
    });
  }

  private debug(event: string, details?: unknown): void {
    if (!this.debugRtc) return;
    const now = new Date().toISOString();
    if (details === undefined) {
      console.info(`[docs-collab][rtc][${now}] ${event}`);
      return;
    }
    console.info(`[docs-collab][rtc][${now}] ${event}`, details);
  }

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

  getRoomPeerStatuses(): DocsCollabMeshPeerStatus[] {
    return this.lastRoomPeers.map((peer) => {
      const entry = this.mesh.get(peer.id);
      const link = entry?.dc?.readyState === "open" ? "connected" : (entry?.link ?? "connecting");
      return {
        ...peer,
        link,
      };
    });
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
    this.debug("signal-request", { action, requestUrl });

    const res = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: requestBody,
    });
    const text = await res.text();
    this.debug("signal-response", { action, status: res.status, ok: res.ok, bytes: text.length });
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

  private linkState(pc: RTCPeerConnection): DocsCollabPeerLinkState {
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
    this.debug("send-signal", {
      to,
      type,
      hasPayload: payload !== undefined && payload !== null,
    });
    return this.api("signal", { room: this.room, peerId: this.myId, to, type, payload });
  }

  private candidateType(candidate: string): string {
    const match = candidate.match(/\styp\s([a-z]+)/i);
    return match?.[1] ?? "unknown";
  }

  private candidateProtocol(candidate: string): string {
    const parts = candidate.split(/\s+/);
    return parts[2] ?? "unknown";
  }

  private async logConnectionDiagnostics(
    remoteId: string,
    pc: RTCPeerConnection,
    reason: "connected" | "failed" | "relay-restart",
  ): Promise<void> {
    if (!this.debugRtc) return;
    try {
      const report = await pc.getStats();
      const rows = Array.from(report.values());
      const candidateById = new Map<string, RTCStats>();
      let selectedPair: RTCStats | null = null;

      for (const row of rows) {
        if (row.type === "local-candidate" || row.type === "remote-candidate") {
          candidateById.set(row.id, row);
        }
        if (row.type === "candidate-pair") {
          const maybeSelected =
            (row as RTCStats & { selected?: boolean; nominated?: boolean; state?: string })
              .selected === true ||
            ((row as RTCStats & { nominated?: boolean; state?: string }).nominated === true &&
              (row as RTCStats & { nominated?: boolean; state?: string }).state === "succeeded");
          if (maybeSelected) selectedPair = row;
        }
      }

      const pair = selectedPair as
        | (RTCStats & {
            state?: string;
            localCandidateId?: string;
            remoteCandidateId?: string;
            currentRoundTripTime?: number;
          })
        | null;
      const local = pair?.localCandidateId ? candidateById.get(pair.localCandidateId) : null;
      const remote = pair?.remoteCandidateId ? candidateById.get(pair.remoteCandidateId) : null;
      this.debug("pc-diagnostics", {
        remoteId,
        reason,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        selectedPair: pair
          ? {
              state: pair.state,
              rtt: pair.currentRoundTripTime,
              localType: (local as RTCStats & { candidateType?: string })?.candidateType,
              localProtocol: (local as RTCStats & { protocol?: string })?.protocol,
              remoteType: (remote as RTCStats & { candidateType?: string })?.candidateType,
              remoteProtocol: (remote as RTCStats & { protocol?: string })?.protocol,
            }
          : null,
      });
    } catch (error) {
      this.debug("pc-diagnostics-error", { remoteId, reason, error });
    }
  }

  private async restartWithRelay(remoteId: string, entry: MeshPeerEntry): Promise<void> {
    if (
      !entry.initiator ||
      entry.mode === "relay" ||
      entry.relayFallbackTried ||
      !this.turnConfigured
    ) {
      return;
    }
    entry.mode = "relay";
    entry.relayFallbackTried = true;
    entry.link = "connecting";
    this.emit({ type: "link" });
    this.debug("relay-fallback-start", {
      remoteId,
      initiator: entry.initiator,
      hadTurnConfigured: this.turnConfigured,
    });
    try {
      entry.pc.setConfiguration(toRtcConfig(this.rtcSettings, "relay"));
      entry.pc.restartIce();
      await this.logConnectionDiagnostics(remoteId, entry.pc, "relay-restart");
      const offer = await entry.pc.createOffer({ iceRestart: true });
      await entry.pc.setLocalDescription(offer);
      await this.sendSignal(remoteId, "offer", entry.pc.localDescription);
    } catch (error) {
      this.debug("relay-fallback-error", { remoteId, error });
      console.warn("[docs-collab] relay fallback failed", remoteId, error);
    }
  }

  private makePc(remoteId: string, mode: "direct" | "relay"): RTCPeerConnection {
    const pc = new RTCPeerConnection(toRtcConfig(this.rtcSettings, mode));
    this.debug("pc-created", {
      remoteId,
      mode,
      config: toRtcConfig(this.rtcSettings, mode),
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.debug("ice-candidate-local", {
          remoteId,
          type: this.candidateType(e.candidate.candidate),
          protocol: this.candidateProtocol(e.candidate.candidate),
        });
        void this.sendSignal(remoteId, "ice", e.candidate.toJSON());
      } else {
        this.debug("ice-candidate-local-end", { remoteId });
      }
    };
    pc.onicecandidateerror = (event) => {
      this.debug("ice-candidate-error", {
        remoteId,
        errorCode: event.errorCode,
        errorText: event.errorText,
        hostCandidate: event.hostCandidate,
        url: event.url,
      });
    };
    pc.onsignalingstatechange = () => {
      this.debug("pc-signaling-state", { remoteId, signalingState: pc.signalingState });
    };
    pc.onicegatheringstatechange = () => {
      this.debug("pc-ice-gathering-state", { remoteId, iceGatheringState: pc.iceGatheringState });
    };
    pc.onconnectionstatechange = () => {
      this.debug("pc-connection-state", { remoteId, connectionState: pc.connectionState });
      const entry = this.mesh.get(remoteId);
      if (!entry) return;
      if (pc.connectionState === "failed") {
        void this.logConnectionDiagnostics(remoteId, pc, "failed");
        void this.restartWithRelay(remoteId, entry);
      }
    };
    pc.oniceconnectionstatechange = () => {
      const entry = this.mesh.get(remoteId);
      if (entry) {
        entry.link = this.linkState(pc);
        this.debug("pc-ice-connection-state", {
          remoteId,
          mode: entry.mode,
          relayFallbackTried: entry.relayFallbackTried,
          iceConnectionState: pc.iceConnectionState,
        });
        this.emit({ type: "link" });
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          void this.logConnectionDiagnostics(remoteId, pc, "connected");
        }
        if (pc.iceConnectionState === "failed") {
          void this.logConnectionDiagnostics(remoteId, pc, "failed");
          void this.restartWithRelay(remoteId, entry);
        }
      }
    };
    return pc;
  }

  private attachDataChannel(dc: RTCDataChannel, remoteId: string): void {
    const entry = this.mesh.get(remoteId);
    if (!entry) return;
    entry.dc = dc;
    this.debug("dc-attached", {
      remoteId,
      label: dc.label,
      readyState: dc.readyState,
    });
    dc.onopen = () => {
      entry.link = "connected";
      this.debug("dc-open", { remoteId });
      this.emit({ type: "dc-open", from: remoteId });
    };
    dc.onclose = () => {
      if (entry.dc === dc) {
        entry.dc = null;
        entry.link = "disconnected";
        this.debug("dc-close", { remoteId });
        this.emit({ type: "link" });
      }
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

    const mode = this.rtcSettings.forceRelay && this.turnConfigured ? "relay" : "direct";
    const pc = this.makePc(remoteId, mode);
    const entry: MeshPeerEntry = {
      name: remoteName,
      pc,
      dc: null,
      link: "connecting",
      signalSent: false,
      mode,
      relayFallbackTried: mode === "relay",
      initiator,
    };
    this.mesh.set(remoteId, entry);
    this.debug("peer-connect-start", {
      remoteId,
      remoteName,
      initiator,
      mode,
    });

    if (initiator) {
      const dc = pc.createDataChannel(DC_LABEL);
      this.attachDataChannel(dc, remoteId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.sendSignal(remoteId, "offer", pc.localDescription);
      entry.signalSent = true;
      this.debug("offer-sent", { remoteId });
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
    this.debug("peer-removed", { remoteId });
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
    this.debug("offer-received", { from, type: sdp.type });
    let entry = this.mesh.get(from);
    if (!entry) {
      const mode = this.rtcSettings.forceRelay && this.turnConfigured ? "relay" : "direct";
      const pc = this.makePc(from, mode);
      entry = {
        name: from.slice(0, 8),
        pc,
        dc: null,
        link: "connecting",
        signalSent: false,
        mode,
        relayFallbackTried: mode === "relay",
        initiator: false,
      };
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
      this.debug("answer-sent", { to: from });
    };
    try {
      await applyOffer();
    } catch (error) {
      this.removePeer(from);
      const mode = this.rtcSettings.forceRelay && this.turnConfigured ? "relay" : "direct";
      const pc = this.makePc(from, mode);
      entry = {
        name: from.slice(0, 8),
        pc,
        dc: null,
        link: "connecting",
        signalSent: false,
        mode,
        relayFallbackTried: mode === "relay",
        initiator: false,
      };
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
    this.debug("answer-received", { from, type: sdp.type });
    await this.safeSetRemoteDescription(entry.pc, sdp);
  }

  private async handleIce(from: string, candidate: RTCIceCandidateInit): Promise<void> {
    const entry = this.mesh.get(from);
    if (!entry) return;
    try {
      if (typeof candidate.candidate === "string") {
        this.debug("ice-candidate-remote", {
          from,
          type: this.candidateType(candidate.candidate),
          protocol: this.candidateProtocol(candidate.candidate),
        });
      }
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
    this.debug("poll-update", {
      peersInRoom: peers.length,
      incomingMessages: messages.length,
    });
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

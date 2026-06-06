import { toRtcConfig, turnUrlCount } from "@/lib/rtc/config";
import { rtcLog } from "@/lib/rtc/log";
import type { HttpSignalingClient, HttpSignalingPollResult } from "@/lib/rtc/signaling/http-client";
import type { RtcSessionBinding } from "@/lib/rtc/session/bindings";
import {
  flushPendingIce,
  parseCandidateProtocol,
  parseCandidateType,
  safeSetRemoteDescription,
  toSessionDescriptionPayload,
} from "@/lib/rtc/session/sdp";
import { logSelectedPairTelemetry } from "@/lib/rtc/telemetry/selected-pair";
import type {
  IceMode,
  RtcLinkState,
  RtcPeerDescriptor,
  RtcPollIntervals,
  RtcSettings,
  SignalingChannel,
} from "@/lib/rtc/types";
import { sortRtcSignalMessages } from "@/lib/rtc/types";

export type InitiatorRule = "lowerId" | "higherId";

export type RtcPeerMeshPorts = {
  createPeerConnection?: (config: RTCConfiguration) => RTCPeerConnection;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
};

export type RtcPeerMeshOptions = {
  channel: SignalingChannel;
  room: string;
  signaling: HttpSignalingClient;
  rtcSettings: RtcSettings;
  binding?: RtcSessionBinding;
  pollIntervals?: RtcPollIntervals;
  iceCandidatePoolSize?: number;
  initiatorRule?: InitiatorRule;
  recoverOnUnknownPeer?: boolean;
  ports?: RtcPeerMeshPorts;
  formatInboundDescription?: (
    payload: unknown,
    fallbackType: RTCSdpType,
  ) => RTCSessionDescriptionInit | null;
  formatOutboundDescription?: (description: RTCSessionDescriptionInit) => RTCSessionDescriptionInit;
  onLinkChange?: () => void;
  onUnknownPeer?: () => void;
  shouldConnectToPeer?: (peer: RtcPeerDescriptor) => boolean;
  shouldHandleRtcSignals?: () => boolean;
  onPollData?: (data: HttpSignalingPollResult) => void | Promise<void>;
  onPeerRemoved?: (remoteId: string, name: string, reason: "bye" | "roster") => void;
  onConnectionFailed?: (remoteId: string, name: string) => void;
  onPollError?: (error: unknown) => void;
  onPeerConnected?: (remoteId: string) => void;
};

type MeshPeerEntry = {
  name: string;
  pc: RTCPeerConnection;
  mode: IceMode;
  relayFallbackTried: boolean;
  initiator: boolean;
  pendingIce: RTCIceCandidateInit[];
  signalSent: boolean;
  remoteStream?: MediaStream;
  dataChannel?: RTCDataChannel | null;
};

const DEFAULT_POLL_INTERVALS: RtcPollIntervals = {
  connectingMs: 400,
  steadyMs: 1200,
};

export class RtcPeerMesh {
  private myId: string | null = null;

  private myName = "";

  private sessionKey: string | null = null;

  private lastMsgId = 0;

  private lastRoomPeers: RtcPeerDescriptor[] = [];

  private readonly peers = new Map<string, MeshPeerEntry>();

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  private rejoinInFlight = false;

  private readonly turnConfigured: boolean;

  private readonly createPeerConnection: (config: RTCConfiguration) => RTCPeerConnection;

  private readonly scheduleTimeout: typeof setTimeout;

  private readonly cancelTimeout: typeof clearTimeout;

  constructor(private readonly options: RtcPeerMeshOptions) {
    this.turnConfigured = turnUrlCount(options.rtcSettings) > 0;
    this.createPeerConnection =
      options.ports?.createPeerConnection ?? ((config) => new RTCPeerConnection(config));
    this.scheduleTimeout = options.ports?.setTimeout ?? setTimeout.bind(globalThis);
    this.cancelTimeout = options.ports?.clearTimeout ?? clearTimeout.bind(globalThis);
  }

  private log(event: string, details?: unknown): void {
    rtcLog({ channel: this.options.channel, peerId: this.myId }, event, details);
  }

  private pollIntervals(): RtcPollIntervals {
    return this.options.pollIntervals ?? DEFAULT_POLL_INTERVALS;
  }

  private isInitiator(remoteId: string): boolean {
    if (!this.myId) return false;
    const rule = this.options.initiatorRule ?? "lowerId";
    return rule === "lowerId" ? this.myId < remoteId : this.myId > remoteId;
  }

  private initialMode(): IceMode {
    return this.options.rtcSettings.forceRelay && this.turnConfigured ? "relay" : "direct";
  }

  private formatInbound(
    payload: unknown,
    fallbackType: RTCSdpType,
  ): RTCSessionDescriptionInit | null {
    if (this.options.formatInboundDescription) {
      return this.options.formatInboundDescription(payload, fallbackType);
    }
    return toSessionDescriptionPayload(payload, fallbackType);
  }

  private formatOutbound(description: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
    if (this.options.formatOutboundDescription) {
      return this.options.formatOutboundDescription(description);
    }
    return description;
  }

  private linkState(entry: MeshPeerEntry): RtcLinkState {
    if (this.options.binding?.kind === "data") {
      return this.options.binding.linkState(entry.dataChannel ?? null, entry.pc);
    }
    const state = entry.pc.connectionState;
    if (state === "connected") return "connected";
    if (state === "connecting" || state === "new") return "connecting";
    if (state === "failed") return "failed";
    if (state === "disconnected") return "disconnected";
    return "closed";
  }

  getMyId(): string | null {
    return this.myId;
  }

  getRoomPeers(): RtcPeerDescriptor[] {
    return this.lastRoomPeers;
  }

  getPeerLinkStates(): Array<RtcPeerDescriptor & { link: RtcLinkState }> {
    return this.lastRoomPeers.map((peer) => {
      const entry = this.peers.get(peer.id);
      return {
        ...peer,
        link: entry ? this.linkState(entry) : "connecting",
      };
    });
  }

  getPeerConnection(remoteId: string): RTCPeerConnection | null {
    return this.peers.get(remoteId)?.pc ?? null;
  }

  getDataChannel(remoteId: string): RTCDataChannel | null {
    return this.peers.get(remoteId)?.dataChannel ?? null;
  }

  getRemoteStream(remoteId: string): MediaStream | null {
    return this.peers.get(remoteId)?.remoteStream ?? null;
  }

  getPeerIds(): string[] {
    return [...this.peers.keys()];
  }

  linkCount(): number {
    if (this.options.binding?.kind === "data") {
      let count = 0;
      for (const entry of this.peers.values()) {
        if (entry.dataChannel?.readyState === "open") count += 1;
      }
      return count;
    }
    let count = 0;
    for (const entry of this.peers.values()) {
      if (entry.pc.connectionState === "connected") count += 1;
    }
    return count;
  }

  broadcastJson(message: unknown): void {
    const raw = JSON.stringify(message);
    for (const entry of this.peers.values()) {
      if (entry.dataChannel?.readyState !== "open") continue;
      try {
        entry.dataChannel.send(raw);
      } catch {
        // ignore
      }
    }
  }

  sendJsonTo(remoteId: string, message: unknown): void {
    const entry = this.peers.get(remoteId);
    if (entry?.dataChannel?.readyState !== "open") return;
    try {
      entry.dataChannel.send(JSON.stringify(message));
    } catch {
      // ignore
    }
  }

  private isUnknownPeerError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.message.includes("unknown_peer");
  }

  private notifyLinkChange(): void {
    this.options.onLinkChange?.();
  }

  private async sendSignal(to: string, type: string, payload: unknown): Promise<void> {
    if (!this.myId) return;
    await this.options.signaling.send({
      room: this.options.room,
      from: this.myId,
      to,
      type,
      payload,
      sessionKey: this.sessionKey ?? undefined,
    });
  }

  private removePeer(remoteId: string, reason: "bye" | "roster" | "local" = "local"): void {
    const entry = this.peers.get(remoteId);
    if (!entry) return;
    const name = entry.name;
    entry.dataChannel?.close();
    entry.pc.close();
    this.peers.delete(remoteId);
    this.log("peer-removed", { remoteId, reason });
    if (reason !== "local") {
      this.options.onPeerRemoved?.(remoteId, name, reason);
    }
    this.notifyLinkChange();
  }

  private wirePcEvents(remoteId: string, entry: MeshPeerEntry): void {
    const { pc } = entry;
    pc.onicecandidate = (event) => {
      const candidate = event.candidate?.toJSON();
      if (
        !candidate ||
        typeof candidate.candidate !== "string" ||
        candidate.candidate.trim() === ""
      ) {
        if (event.candidate === null) this.log("ice-candidate-local-end", { remoteId });
        return;
      }
      this.log("ice-candidate-local", {
        remoteId,
        mode: entry.mode,
        candidateType: parseCandidateType(candidate.candidate),
        protocol: parseCandidateProtocol(candidate.candidate),
      });
      void this.sendSignal(remoteId, "ice", candidate).catch((error) => {
        if (this.options.recoverOnUnknownPeer && this.isUnknownPeerError(error)) {
          void this.recoverUnknownPeer();
        }
      });
    };
    pc.onconnectionstatechange = () => {
      this.log("pc-connection-state", {
        remoteId,
        mode: entry.mode,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
      });
      if (pc.connectionState === "connected") {
        void logSelectedPairTelemetry(this.options.channel, this.myId, remoteId, pc, "connected");
        this.options.onPeerConnected?.(remoteId);
      }
      if (pc.connectionState === "failed") {
        void logSelectedPairTelemetry(this.options.channel, this.myId, remoteId, pc, "failed");
        void this.restartWithRelay(remoteId, entry).then((retried) => {
          if (!retried) this.options.onConnectionFailed?.(remoteId, entry.name);
        });
      }
      this.notifyLinkChange();
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        void logSelectedPairTelemetry(this.options.channel, this.myId, remoteId, pc, "connected");
      }
      if (pc.iceConnectionState === "failed") {
        void this.restartWithRelay(remoteId, entry).then((retried) => {
          if (!retried) this.options.onConnectionFailed?.(remoteId, entry.name);
        });
      }
      this.notifyLinkChange();
    };
  }

  private makePc(remoteId: string, mode: IceMode): RTCPeerConnection {
    const config = toRtcConfig(this.options.rtcSettings, mode, {
      iceCandidatePoolSize: this.options.iceCandidatePoolSize,
    });
    this.log("pc-created", { remoteId, mode, iceTransportPolicy: config.iceTransportPolicy });
    const pc = this.createPeerConnection(config);
    return pc;
  }

  private attachBinding(remoteId: string, pc: RTCPeerConnection, initiator: boolean): void {
    const binding = this.options.binding;
    const entry = this.peers.get(remoteId);
    if (!binding || !entry) return;
    if (binding.kind === "media") {
      entry.remoteStream = binding.attach(pc, remoteId);
      return;
    }
    if (initiator) {
      entry.dataChannel = binding.attachInitiator(pc, remoteId);
      return;
    }
    binding.attachReceiver(pc, remoteId, (channel) => {
      entry.dataChannel = channel;
    });
  }

  private async restartWithRelay(remoteId: string, entry: MeshPeerEntry): Promise<boolean> {
    if (
      !entry.initiator ||
      entry.mode === "relay" ||
      entry.relayFallbackTried ||
      !this.turnConfigured
    ) {
      return false;
    }
    entry.relayFallbackTried = true;
    this.log("relay-fallback-start", { remoteId, initiator: entry.initiator });
    try {
      this.removePeer(remoteId);
      await this.connectTo(remoteId, entry.name, "relay");
      const next = this.peers.get(remoteId);
      if (!next?.initiator) return false;
      const offer = await next.pc.createOffer({ iceRestart: true });
      const formatted = this.formatOutbound(offer);
      await next.pc.setLocalDescription(formatted);
      await this.sendSignal(remoteId, "offer", next.pc.localDescription);
      next.signalSent = true;
      this.log("relay-fallback-offer-sent", { remoteId });
      void logSelectedPairTelemetry(
        this.options.channel,
        this.myId,
        remoteId,
        next.pc,
        "relay-fallback",
      );
      return true;
    } catch (error) {
      this.log("relay-fallback-failed", { remoteId, error });
      return false;
    }
  }

  private shouldReusePeerEntry(remoteId: string, initiator: boolean): boolean {
    const entry = this.peers.get(remoteId);
    if (!entry) return false;
    if (entry.pc.connectionState === "failed" || entry.pc.iceConnectionState === "failed") {
      this.removePeer(remoteId);
      return false;
    }
    if (this.options.binding?.kind === "data" && entry.dataChannel?.readyState === "open") {
      return true;
    }
    if (this.options.binding?.kind === "media" && entry.pc.connectionState === "connected") {
      return true;
    }
    if (!initiator) return true;
    if (entry.signalSent) return true;
    return false;
  }

  private async connectTo(
    remoteId: string,
    remoteName: string,
    forcedMode?: IceMode,
  ): Promise<void> {
    if (!this.myId || remoteId === this.myId) return;
    const initiator = this.isInitiator(remoteId);
    if (this.shouldReusePeerEntry(remoteId, initiator)) return;
    if (this.peers.has(remoteId)) this.removePeer(remoteId);

    const mode = forcedMode ?? this.initialMode();
    const pc = this.makePc(remoteId, mode);
    const entry: MeshPeerEntry = {
      name: remoteName,
      pc,
      mode,
      relayFallbackTried: mode === "relay",
      initiator,
      pendingIce: [],
      signalSent: false,
      dataChannel: null,
    };
    this.peers.set(remoteId, entry);
    this.wirePcEvents(remoteId, entry);
    this.attachBinding(remoteId, pc, initiator);
    this.log("peer-connect-start", { remoteId, remoteName, initiator, mode });

    if (initiator) {
      const offer = await pc.createOffer();
      const formatted = this.formatOutbound(offer);
      await pc.setLocalDescription(formatted);
      await this.sendSignal(remoteId, "offer", pc.localDescription);
      entry.signalSent = true;
      this.log("offer-sent", { remoteId });
    }
  }

  private async handleOffer(from: string, peerName: string, payload: unknown): Promise<void> {
    const sdp = this.formatInbound(payload, "offer");
    if (!sdp) return;
    let entry = this.peers.get(from);
    if (!entry) {
      const mode = this.initialMode();
      const pc = this.makePc(from, mode);
      entry = {
        name: peerName,
        pc,
        mode,
        relayFallbackTried: mode === "relay",
        initiator: false,
        pendingIce: [],
        signalSent: false,
        dataChannel: null,
      };
      this.peers.set(from, entry);
      this.wirePcEvents(from, entry);
      this.attachBinding(from, pc, false);
    }
    if (entry.pc.signalingState !== "stable") {
      try {
        await entry.pc.setLocalDescription({ type: "rollback" });
      } catch {
        // Ignore rollback failures on incompatible states.
      }
    }
    await safeSetRemoteDescription(entry.pc, sdp);
    await flushPendingIce(entry.pc, entry.pendingIce);
    const answer = await entry.pc.createAnswer();
    const formatted = this.formatOutbound(answer);
    await entry.pc.setLocalDescription(formatted);
    await this.sendSignal(from, "answer", entry.pc.localDescription);
    entry.signalSent = true;
    this.log("answer-sent", { to: from });
  }

  private async handleAnswer(from: string, payload: unknown): Promise<void> {
    const entry = this.peers.get(from);
    if (!entry) return;
    const sdp = this.formatInbound(payload, "answer");
    if (!sdp) return;
    if (entry.pc.signalingState === "stable") return;
    await safeSetRemoteDescription(entry.pc, sdp);
    await flushPendingIce(entry.pc, entry.pendingIce);
  }

  private async handleIce(from: string, payload: unknown): Promise<void> {
    const entry = this.peers.get(from);
    if (!entry) return;
    const candidate = payload as RTCIceCandidateInit | null;
    if (
      !candidate ||
      typeof candidate.candidate !== "string" ||
      candidate.candidate.trim() === ""
    ) {
      return;
    }
    if (!entry.pc.remoteDescription) {
      entry.pendingIce.push(candidate);
      return;
    }
    try {
      await entry.pc.addIceCandidate(candidate);
    } catch {
      if (!entry.pc.remoteDescription) entry.pendingIce.push(candidate);
    }
  }

  private async handleBye(from: string): Promise<void> {
    this.removePeer(from, "bye");
  }

  private rtcSignalsEnabled(): boolean {
    return this.options.shouldHandleRtcSignals?.() ?? true;
  }

  private async onPoll(data: HttpSignalingPollResult): Promise<void> {
    await this.options.onPollData?.(data);

    const roomIds = new Set(data.peers.map((peer) => peer.id));
    this.lastRoomPeers = data.peers.filter((peer) => peer.id !== this.myId);

    if (this.rtcSignalsEnabled()) {
      for (const peer of this.lastRoomPeers) {
        if (this.options.shouldConnectToPeer && !this.options.shouldConnectToPeer(peer)) {
          continue;
        }
        void this.connectTo(peer.id, peer.name).catch((error) => {
          this.log("peer-connect-failed", { remoteId: peer.id, error });
        });
      }

      for (const id of [...this.peers.keys()]) {
        if (!roomIds.has(id)) this.removePeer(id, "roster");
      }
    }

    if (!this.rtcSignalsEnabled()) {
      this.notifyLinkChange();
      return;
    }

    const signals = sortRtcSignalMessages(
      data.messages.filter((message) => message.type !== "chat"),
    );
    for (const message of signals) {
      if (message.id !== undefined) {
        this.lastMsgId = Math.max(this.lastMsgId, message.id);
      }
      const peerName = data.peers.find((peer) => peer.id === message.from)?.name ?? "Peer";
      try {
        if (message.type === "offer") {
          await this.handleOffer(message.from, peerName, message.payload);
        } else if (message.type === "answer") {
          await this.handleAnswer(message.from, message.payload);
        } else if (message.type === "ice") {
          await this.handleIce(message.from, message.payload);
        } else if (message.type === "bye") {
          await this.handleBye(message.from);
        }
      } catch (error) {
        this.log("signal-handle-failed", { type: message.type, from: message.from, error });
      }
    }
    this.notifyLinkChange();
  }

  private async pollOnce(): Promise<void> {
    if (!this.myId) return;
    const data = await this.options.signaling.poll({
      room: this.options.room,
      peerId: this.myId,
      since: this.lastMsgId,
      sessionKey: this.sessionKey ?? undefined,
    });
    await this.onPoll(data);
  }

  private schedulePoll(steady = false): void {
    if (!this.myId) return;
    const intervals = this.pollIntervals();
    const delay = steady ? intervals.steadyMs : intervals.connectingMs;
    this.pollTimer = this.scheduleTimeout(() => {
      void this.pollOnce()
        .catch((error) => {
          if (this.options.recoverOnUnknownPeer && this.isUnknownPeerError(error)) {
            void this.recoverUnknownPeer();
            return;
          }
          this.log("poll-failed", { error });
          this.options.onPollError?.(error);
        })
        .finally(() => this.schedulePoll(true));
    }, delay);
  }

  stopPolling(): void {
    if (this.pollTimer !== null) {
      this.cancelTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async recoverUnknownPeer(): Promise<void> {
    if (!this.options.recoverOnUnknownPeer || this.rejoinInFlight || !this.myName.trim()) return;
    this.rejoinInFlight = true;
    const previousPeerId = this.myId;
    this.log("peer-recover-start", { previousPeerId });
    try {
      for (const id of [...this.peers.keys()]) this.removePeer(id);
      this.myId = null;
      this.lastMsgId = 0;
      const joined = await this.options.signaling.join({
        room: this.options.room,
        name: this.myName,
      });
      this.myId = joined.peerId ?? null;
      if (typeof joined.sessionKey === "string") this.sessionKey = joined.sessionKey;
      await this.onPoll({ peers: joined.peers, messages: [] });
      this.log("peer-recover-success", { previousPeerId, peerId: this.myId });
    } catch (error) {
      this.log("peer-recover-error", { previousPeerId, error });
      this.options.onUnknownPeer?.();
    } finally {
      this.rejoinInFlight = false;
    }
  }

  async join(input: { name: string; peerId?: string }): Promise<{
    peerId: string;
    peers: RtcPeerDescriptor[];
    sessionKey?: string | null;
  }> {
    this.myName = input.name.trim();
    if (!this.myName) throw new Error("Display name is required");
    const joined = await this.options.signaling.join({
      room: this.options.room,
      name: this.myName,
      peerId: input.peerId,
    });
    this.myId = joined.peerId ?? input.peerId ?? null;
    if (!this.myId) throw new Error("Signaling join did not return peerId");
    if (typeof joined.sessionKey === "string") this.sessionKey = joined.sessionKey;
    this.schedulePoll();
    await this.onPoll({ peers: joined.peers, messages: [] });
    return {
      peerId: this.myId,
      peers: joined.peers,
      sessionKey: joined.sessionKey,
    };
  }

  getSessionKey(): string | null {
    return this.sessionKey;
  }

  getMyName(): string {
    return this.myName;
  }

  async updateJoinName(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed || !this.myId) return;
    this.myName = trimmed;
    const joined = await this.options.signaling.join({
      room: this.options.room,
      name: this.myName,
      peerId: this.myId,
    });
    if (typeof joined.sessionKey === "string") this.sessionKey = joined.sessionKey;
  }

  async sendByeToAll(): Promise<void> {
    for (const remoteId of [...this.peers.keys()]) {
      try {
        await this.sendSignal(remoteId, "bye", null);
      } catch {
        // Best-effort bye while leaving.
      }
    }
  }

  async replaceAudioTrack(track: MediaStreamTrack): Promise<void> {
    const updates: Promise<void>[] = [];
    for (const entry of this.peers.values()) {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "audio");
      if (!sender) continue;
      updates.push(sender.replaceTrack(track));
    }
    await Promise.all(updates);
  }

  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    const updates: Promise<void>[] = [];
    for (const entry of this.peers.values()) {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) continue;
      updates.push(sender.replaceTrack(track));
    }
    await Promise.all(updates);
  }

  async leave(): Promise<void> {
    this.stopPolling();
    if (this.myId) {
      try {
        await this.options.signaling.leave({
          room: this.options.room,
          peerId: this.myId,
          sessionKey: this.sessionKey ?? undefined,
        });
      } catch {
        // Ignore leave failures during cleanup.
      }
    }
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.myId = null;
    this.myName = "";
    this.sessionKey = null;
    this.lastMsgId = 0;
    this.lastRoomPeers = [];
  }
}

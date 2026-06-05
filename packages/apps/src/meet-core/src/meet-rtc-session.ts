import { wgwApiBaseUrl, wgwFetch } from "@/lib/api/wgw/http";
import { createMediaBinding } from "@/lib/rtc/session/bindings";
import { RtcPeerMesh } from "@/lib/rtc/session/peer-mesh";
import { toSessionDescriptionPayload } from "@/lib/rtc/session/sdp";
import {
  HttpSignalingClient,
  type HttpSignalingFetch,
  type HttpSignalingPollResult,
} from "@/lib/rtc/signaling/http-client";
import type { RtcPeerDescriptor, RtcSettings } from "@/lib/rtc/types";
import { sanitizeRtcSdp } from "@/meet-core/src/meet-rtc-sdp";

function voiceSignalingFetch(url: string, init: RequestInit): Promise<Response> {
  const base = wgwApiBaseUrl();
  const path = url.startsWith(base) ? url.slice(base.length) : url;
  return wgwFetch(path.startsWith("/") ? path : `/${path}`, init);
}

function formatMeetInboundDescription(
  payload: unknown,
  fallbackType: RTCSdpType,
): RTCSessionDescriptionInit | null {
  const raw = toSessionDescriptionPayload(payload, fallbackType);
  if (!raw || typeof raw.sdp !== "string") return raw;
  return { ...raw, sdp: sanitizeRtcSdp(raw.sdp) };
}

function formatMeetOutboundDescription(
  description: RTCSessionDescriptionInit,
): RTCSessionDescriptionInit {
  if (typeof description.sdp !== "string") return description;
  return { ...description, sdp: sanitizeRtcSdp(description.sdp) };
}

export type MeetRtcSessionOptions = {
  rtcSettings: RtcSettings;
  apiBase?: string;
  fetchImpl?: HttpSignalingFetch;
  getLocalStream: () => MediaStream | null;
  onLinkChange?: () => void;
  onPollData?: (data: HttpSignalingPollResult) => void | Promise<void>;
  shouldConnectToPeer?: (peer: RtcPeerDescriptor) => boolean;
  shouldHandleRtcSignals?: () => boolean;
  onPeerRemoved?: (remoteId: string, name: string, reason: "bye" | "roster") => void;
  onConnectionFailed?: (remoteId: string, name: string) => void;
  onPollError?: (error: unknown) => void;
  onPeerConnected?: (remoteId: string) => void;
};

export class MeetRtcSession {
  private mesh: RtcPeerMesh | null = null;

  constructor(private readonly options: MeetRtcSessionOptions) {}

  private createMesh(room: string): RtcPeerMesh {
    const signaling = new HttpSignalingClient({
      channel: "voice",
      apiBase: this.options.apiBase ?? `${wgwApiBaseUrl()}/voice`,
      fetchImpl: this.options.fetchImpl ?? voiceSignalingFetch,
    });

    const binding = createMediaBinding({
      getLocalStream: this.options.getLocalStream,
      onRemoteStream: () => this.options.onLinkChange?.(),
    });

    return new RtcPeerMesh({
      channel: "voice",
      room,
      signaling,
      rtcSettings: this.options.rtcSettings,
      binding,
      pollIntervals: { connectingMs: 250, steadyMs: 1200 },
      initiatorRule: "higherId",
      formatInboundDescription: formatMeetInboundDescription,
      formatOutboundDescription: formatMeetOutboundDescription,
      shouldConnectToPeer: this.options.shouldConnectToPeer,
      shouldHandleRtcSignals: this.options.shouldHandleRtcSignals,
      onPollData: this.options.onPollData,
      onPeerRemoved: this.options.onPeerRemoved,
      onConnectionFailed: this.options.onConnectionFailed,
      onPollError: this.options.onPollError,
      onPeerConnected: this.options.onPeerConnected,
      onLinkChange: this.options.onLinkChange,
    });
  }

  getMesh(): RtcPeerMesh | null {
    return this.mesh;
  }

  getMyId(): string | null {
    return this.mesh?.getMyId() ?? null;
  }

  getSessionKey(): string | null {
    return this.mesh?.getSessionKey() ?? null;
  }

  getPeerConnection(remoteId: string): RTCPeerConnection | null {
    return this.mesh?.getPeerConnection(remoteId) ?? null;
  }

  getRemoteStream(remoteId: string): MediaStream | null {
    return this.mesh?.getRemoteStream(remoteId) ?? null;
  }

  getPeerIds(): string[] {
    return this.mesh?.getPeerIds() ?? [];
  }

  async join(input: { room: string; peerId: string; name: string }): Promise<{
    peerId: string;
    peers: RtcPeerDescriptor[];
    sessionKey?: string | null;
  }> {
    if (this.mesh) await this.leave();
    this.mesh = this.createMesh(input.room);
    const joined = await this.mesh.join({ name: input.name, peerId: input.peerId });
    return joined;
  }

  async updateJoinName(name: string): Promise<void> {
    await this.mesh?.updateJoinName(name);
  }

  async replaceAudioTrack(track: MediaStreamTrack): Promise<void> {
    await this.mesh?.replaceAudioTrack(track);
  }

  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    await this.mesh?.replaceVideoTrack(track);
  }

  async leave(opts?: { sendBye?: boolean }): Promise<void> {
    if (!this.mesh) return;
    if (opts?.sendBye !== false) {
      await this.mesh.sendByeToAll();
    }
    await this.mesh.leave();
    this.mesh = null;
  }
}

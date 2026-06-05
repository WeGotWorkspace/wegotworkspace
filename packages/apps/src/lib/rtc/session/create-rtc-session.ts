import type { RtcSessionBinding } from "@/lib/rtc/session/bindings";
import {
  RtcPeerMesh,
  type InitiatorRule,
  type RtcPeerMeshOptions,
} from "@/lib/rtc/session/peer-mesh";
import {
  createRtcSignalingClient,
  type CreateRtcSignalingClientOptions,
} from "@/lib/rtc/signaling/create-client";
import {
  DEFAULT_RTC_POLL_INTERVALS,
  type RtcPollIntervals,
  type RtcSettings,
  type SignalingChannel,
} from "@/lib/rtc/types";

export type { InitiatorRule };

export type CreateRtcSessionOptions = {
  channel: SignalingChannel;
  room: string;
  rtcSettings: RtcSettings;
  binding?: RtcSessionBinding;
  signaling?: CreateRtcSignalingClientOptions;
  pollIntervals?: RtcPollIntervals;
  iceCandidatePoolSize?: number;
  initiatorRule?: InitiatorRule;
  recoverOnUnknownPeer?: boolean;
  formatInboundDescription?: RtcPeerMeshOptions["formatInboundDescription"];
  formatOutboundDescription?: RtcPeerMeshOptions["formatOutboundDescription"];
  onLinkChange?: () => void;
  onPollData?: RtcPeerMeshOptions["onPollData"];
  shouldConnectToPeer?: RtcPeerMeshOptions["shouldConnectToPeer"];
  shouldHandleRtcSignals?: RtcPeerMeshOptions["shouldHandleRtcSignals"];
  onPeerRemoved?: RtcPeerMeshOptions["onPeerRemoved"];
  onConnectionFailed?: RtcPeerMeshOptions["onConnectionFailed"];
  onPollError?: RtcPeerMeshOptions["onPollError"];
  onPeerConnected?: RtcPeerMeshOptions["onPeerConnected"];
  onUnknownPeer?: RtcPeerMeshOptions["onUnknownPeer"];
};

const CHANNEL_INITIATOR: Partial<Record<SignalingChannel, InitiatorRule>> = {
  collab: "lowerId",
  voice: "higherId",
};

/** Configure `RtcPeerMesh` + `HttpSignalingClient` for a signaling channel. */
export function createRtcSession(options: CreateRtcSessionOptions): RtcPeerMesh {
  const signaling = createRtcSignalingClient({
    channel: options.channel,
    ...options.signaling,
  });

  return new RtcPeerMesh({
    channel: options.channel,
    room: options.room,
    signaling,
    rtcSettings: options.rtcSettings,
    binding: options.binding,
    pollIntervals: options.pollIntervals ?? DEFAULT_RTC_POLL_INTERVALS,
    iceCandidatePoolSize: options.iceCandidatePoolSize,
    initiatorRule: options.initiatorRule ?? CHANNEL_INITIATOR[options.channel] ?? "lowerId",
    recoverOnUnknownPeer: options.recoverOnUnknownPeer ?? true,
    formatInboundDescription: options.formatInboundDescription,
    formatOutboundDescription: options.formatOutboundDescription,
    onLinkChange: options.onLinkChange,
    onPollData: options.onPollData,
    shouldConnectToPeer: options.shouldConnectToPeer,
    shouldHandleRtcSignals: options.shouldHandleRtcSignals,
    onPeerRemoved: options.onPeerRemoved,
    onConnectionFailed: options.onConnectionFailed,
    onPollError: options.onPollError,
    onPeerConnected: options.onPeerConnected,
    onUnknownPeer: options.onUnknownPeer,
  });
}

import type { InboundMediaTotals } from "@/meet-core/src/meet-inbound-media-stats";

export type PeerInboundSample = {
  t: number;
  videoBytes: number;
  audioBytes: number;
  videoFramesDecoded: number;
  audioEnergy: number | null;
  videoStallTicks: number;
  audioStallTicks: number;
  pollCount: number;
};

export type PeerMediaHint = {
  camera: boolean;
  mic: boolean;
};

const MIN_SAMPLE_INTERVAL_MS = 400;

export function createPeerInboundSample(
  totals: InboundMediaTotals,
  now: number,
): PeerInboundSample {
  return {
    t: now,
    videoBytes: totals.videoBytes,
    audioBytes: totals.audioBytes,
    videoFramesDecoded: totals.videoFramesDecoded,
    audioEnergy: totals.audioEnergy,
    videoStallTicks: 0,
    audioStallTicks: 0,
    pollCount: 1,
  };
}

export type PeerInboundAdvanceResult =
  | { kind: "too-soon" }
  | { kind: "baseline"; sample: PeerInboundSample; mediaHint: null }
  | { kind: "updated"; sample: PeerInboundSample; mediaHint: PeerMediaHint | null };

/** Advance RTP counters into stall heuristics for remote camera/mic UI hints. */
export function advancePeerInboundSample(
  previous: PeerInboundSample | undefined,
  totals: InboundMediaTotals,
  now: number,
): PeerInboundAdvanceResult {
  if (!previous) {
    return {
      kind: "baseline",
      sample: createPeerInboundSample(totals, now),
      mediaHint: null,
    };
  }

  if (now - previous.t < MIN_SAMPLE_INTERVAL_MS) {
    return { kind: "too-soon" };
  }

  const dvb = totals.videoBytes - previous.videoBytes;
  const dab = totals.audioBytes - previous.audioBytes;
  const dvf = totals.videoFramesDecoded - previous.videoFramesDecoded;
  const dEnergy =
    totals.audioEnergy != null && previous.audioEnergy != null
      ? totals.audioEnergy - previous.audioEnergy
      : null;

  let videoStallTicks = previous.videoStallTicks;
  let audioStallTicks = previous.audioStallTicks;

  if (previous.pollCount >= 2) {
    const videoFrozen = dvf === 0 && dvb < 260;
    videoStallTicks = videoFrozen ? previous.videoStallTicks + 1 : 0;

    let audioQuiet = dab < 52;
    if (dEnergy != null) {
      audioQuiet = audioQuiet && dEnergy < 1e-7;
    }
    audioStallTicks = audioQuiet ? previous.audioStallTicks + 1 : 0;
  }

  const sample: PeerInboundSample = {
    t: now,
    videoBytes: totals.videoBytes,
    audioBytes: totals.audioBytes,
    videoFramesDecoded: totals.videoFramesDecoded,
    audioEnergy: totals.audioEnergy,
    videoStallTicks,
    audioStallTicks,
    pollCount: previous.pollCount + 1,
  };

  if (sample.pollCount < 3) {
    return { kind: "updated", sample, mediaHint: null };
  }

  return {
    kind: "updated",
    sample,
    mediaHint: {
      camera: videoStallTicks < 3,
      mic: audioStallTicks < 5,
    },
  };
}

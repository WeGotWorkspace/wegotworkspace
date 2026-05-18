export type InboundMediaTotals = {
  videoBytes: number;
  audioBytes: number;
  videoFramesDecoded: number;
  /** Sum of `totalAudioEnergy` across audio inbound-rtp reports when the stat exists. */
  audioEnergy: number | null;
};

/** Aggregate inbound RTP counters for heuristic remote camera/mic indicators. */
export async function readInboundMediaTotals(pc: RTCPeerConnection): Promise<InboundMediaTotals> {
  const stats = await pc.getStats();
  let videoBytes = 0;
  let audioBytes = 0;
  let videoFramesDecoded = 0;
  let audioEnergySum = 0;
  let sawAudioEnergy = false;

  stats.forEach((report) => {
    if (report.type !== "inbound-rtp") return;
    const r = report as {
      kind?: string;
      bytesReceived?: number;
      framesDecoded?: number;
      totalAudioEnergy?: number;
    };
    if (r.kind === "video") {
      videoBytes += r.bytesReceived ?? 0;
      videoFramesDecoded += r.framesDecoded ?? 0;
    } else if (r.kind === "audio") {
      audioBytes += r.bytesReceived ?? 0;
      if (typeof r.totalAudioEnergy === "number") {
        audioEnergySum += r.totalAudioEnergy;
        sawAudioEnergy = true;
      }
    }
  });

  return {
    videoBytes,
    audioBytes,
    videoFramesDecoded,
    audioEnergy: sawAudioEnergy ? audioEnergySum : null,
  };
}

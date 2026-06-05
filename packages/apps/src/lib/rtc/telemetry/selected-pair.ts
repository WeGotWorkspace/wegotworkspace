import type { SignalingChannel } from "@/lib/rtc/types";
import { rtcLog } from "@/lib/rtc/log";

export type SelectedPairSummary = {
  state?: string;
  rtt?: number;
  localType?: string;
  localProtocol?: string;
  remoteType?: string;
  remoteProtocol?: string;
};

export async function readSelectedPairSummary(
  pc: RTCPeerConnection,
): Promise<SelectedPairSummary | null> {
  const report = await pc.getStats();
  const rows = Array.from(report.values());
  const candidateById = new Map<string, RTCStats>();
  let selectedPair: RTCStats | null = null;

  for (const row of rows) {
    if (row.type === "local-candidate" || row.type === "remote-candidate") {
      candidateById.set(row.id, row);
    }
    if (row.type === "candidate-pair") {
      const pair = row as RTCStats & {
        selected?: boolean;
        nominated?: boolean;
        state?: string;
      };
      const maybeSelected =
        pair.selected === true || (pair.nominated === true && pair.state === "succeeded");
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
  if (!pair) return null;

  const local = pair.localCandidateId ? candidateById.get(pair.localCandidateId) : null;
  const remote = pair.remoteCandidateId ? candidateById.get(pair.remoteCandidateId) : null;

  return {
    state: pair.state,
    rtt: pair.currentRoundTripTime,
    localType: (local as RTCStats & { candidateType?: string })?.candidateType,
    localProtocol: (local as RTCStats & { protocol?: string })?.protocol,
    remoteType: (remote as RTCStats & { candidateType?: string })?.candidateType,
    remoteProtocol: (remote as RTCStats & { protocol?: string })?.protocol,
  };
}

export async function logSelectedPairTelemetry(
  channel: SignalingChannel,
  peerId: string | null,
  remoteId: string,
  pc: RTCPeerConnection,
  reason: "connected" | "failed" | "relay-fallback",
): Promise<void> {
  try {
    const selectedPair = await readSelectedPairSummary(pc);
    rtcLog({ channel, peerId }, "selected-pair", {
      remoteId,
      reason,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      selectedPair,
    });
  } catch (error) {
    rtcLog({ channel, peerId }, "selected-pair-error", { remoteId, reason, error });
  }
}

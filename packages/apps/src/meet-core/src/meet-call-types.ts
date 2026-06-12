/** Call lifecycle for Meet room sessions. */
export type MeetCallStatus = "idle" | "preparing" | "waiting" | "in-call" | "failed";

export type MeetRemotePeer = {
  id: string;
  name: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  /** Inbound RTP heuristics; null until a few polls after the peer is connected. */
  remoteMedia: { camera: boolean; mic: boolean } | null;
  /** Mic/camera intent from peer (control chat); null until the peer announces. */
  disclosedMedia: { camera: boolean; mic: boolean; screen?: boolean } | null;
};

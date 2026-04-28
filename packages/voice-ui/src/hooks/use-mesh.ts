/**
 * Mesh WebRTC manager — every peer connects to every other peer.
 * Works for up to ~4 participants. Beyond that you want an SFU.
 *
 * Tie-break for who sends the offer: the peer with the lower ID is the
 * "polite" party who waits and answers; the higher ID initiates. This avoids
 * glare without the full perfect-negotiation pattern.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buildRtcConfig, randomId, type IceMode } from "@/lib/webrtc";
import { SignalingClient, type PeerInfo, type SignalMessage } from "@/lib/signaling";
import { loadSettings } from "@/lib/settings";

export type CallStatus = "idle" | "preparing" | "in-call" | "failed";

export interface MediaDeviceOption {
  /** For `getUserMedia` (`deviceId.exact`); may be "". */
  deviceId: string;
  /** Radix Select value — never "" (browsers often use "" before permission labels exist). */
  selectValue: string;
  label: string;
}

export interface RemotePeer {
  id: string;
  name: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

export interface VoiceChatLine {
  key: string;
  fromPeerId: string;
  fromName: string;
  text: string;
  at: number;
  isSelf: boolean;
}

const MAX_CHAT_LINES = 200;

/** SDP must be applied before trickle ICE; order within a type is stable by sender id. */
const SIGNAL_ORDER: Record<SignalMessage["type"], number> = {
  offer: 0,
  answer: 1,
  ice: 2,
  bye: 3,
  chat: 4,
};

function sortSignalMessages(messages: SignalMessage[]): SignalMessage[] {
  return [...messages].sort((a, b) => {
    if (a.type === "chat" && b.type !== "chat") return 1;
    if (b.type === "chat" && a.type !== "chat") return -1;
    if (a.type === "chat" && b.type === "chat") return 0;
    const ar = SIGNAL_ORDER[a.type];
    const br = SIGNAL_ORDER[b.type];
    if (ar !== br) return ar - br;
    return a.from.localeCompare(b.from);
  });
}

export interface MeshState {
  status: CallStatus;
  roomCode: string | null;
  selfId: string | null;
  micOn: boolean;
  camOn: boolean;
  screenOn: boolean;
  startedAt: number | null;
  error: string | null;
  peers: RemotePeer[];
}

interface PeerEntry {
  pc: RTCPeerConnection;
  name: string;
  stream: MediaStream;
  mode: IceMode;
  relayFallbackTried: boolean;
  /** Candidates received before {@code remoteDescription} is set (parallel polls / ordering). */
  pendingIce: RTCIceCandidateInit[];
}

async function flushPendingIce(entry: PeerEntry): Promise<void> {
  const { pc, pendingIce } = entry;
  while (pendingIce.length > 0) {
    const c = pendingIce.shift()!;
    try {
      await pc.addIceCandidate(c);
    } catch {
      /* drop invalid */
    }
  }
}

function mapInputs(kind: MediaDeviceKind, list: MediaDeviceInfo[]): MediaDeviceOption[] {
  let n = 0;
  return list
    .filter((d) => d.kind === kind)
    .map((d) => {
      n += 1;
      const fallback = kind === "audioinput" ? `Microphone ${n}` : `Camera ${n}`;
      const deviceId = d.deviceId;
      const selectValue = deviceId !== "" ? deviceId : `__voice:${kind}:${n}`;
      return {
        deviceId,
        selectValue,
        label: d.label?.trim() ? d.label : fallback,
      };
    });
}

export function useMesh() {
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const signalingRef = useRef<SignalingClient | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const micDeviceIdRef = useRef<string | undefined>(undefined);
  const camDeviceIdRef = useRef<string | undefined>(undefined);
  const stateRef = useRef<MeshState | null>(null);

  const [state, setState] = useState<MeshState>({
    status: "idle",
    roomCode: null,
    selfId: null,
    micOn: true,
    camOn: true,
    screenOn: false,
    startedAt: null,
    error: null,
    peers: [],
  });

  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceOption[]>([]);
  const [selectedMicId, setSelectedMicIdState] = useState<string | null>(null);
  const [selectedCamId, setSelectedCamIdState] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<VoiceChatLine[]>([]);
  const chatSeqRef = useRef(0);

  stateRef.current = state;

  const refreshPeers = useCallback(() => {
    const list: RemotePeer[] = [];
    peersRef.current.forEach((entry, id) => {
      list.push({
        id,
        name: entry.name,
        stream: entry.stream,
        connectionState: entry.pc.connectionState,
      });
    });
    setState((s) => ({ ...s, peers: list }));
  }, []);

  const refreshDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(mapInputs("audioinput", list));
      setVideoInputs(mapInputs("videoinput", list));

      const audioIds = new Set(list.filter((d) => d.kind === "audioinput").map((d) => d.deviceId));
      const videoIds = new Set(list.filter((d) => d.kind === "videoinput").map((d) => d.deviceId));
      setSelectedMicIdState((cur) => {
        if (!cur || audioIds.has(cur)) return cur;
        micDeviceIdRef.current = undefined;
        return null;
      });
      setSelectedCamIdState((cur) => {
        if (!cur || videoIds.has(cur)) return cur;
        camDeviceIdRef.current = undefined;
        return null;
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshDeviceList();
    const md = navigator.mediaDevices;
    if (!md) return;
    const onChange = () => void refreshDeviceList();
    md.addEventListener("devicechange", onChange);
    return () => md.removeEventListener("devicechange", onChange);
  }, [refreshDeviceList]);

  const buildAudioConstraints = useCallback((): MediaTrackConstraints => {
    const id = micDeviceIdRef.current;
    return {
      echoCancellation: true,
      noiseSuppression: true,
      ...(id ? { deviceId: { exact: id } } : {}),
    };
  }, []);

  const buildVideoConstraints = useCallback((): MediaTrackConstraints => {
    const id = camDeviceIdRef.current;
    return id
      ? { width: { ideal: 1280 }, height: { ideal: 720 }, deviceId: { exact: id } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };
  }, []);

  const ensureMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(),
      video: buildVideoConstraints(),
    });
    localStreamRef.current = stream;
    cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    await refreshDeviceList();
    return stream;
  }, [buildAudioConstraints, buildVideoConstraints, refreshDeviceList]);

  const replaceAudioTrackOnAllPeers = useCallback(async (track: MediaStreamTrack) => {
    const ops: Promise<void>[] = [];
    peersRef.current.forEach((entry) => {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) ops.push(sender.replaceTrack(track));
    });
    await Promise.all(ops);
  }, []);

  const replaceVideoTrackOnAllPeers = useCallback(async (track: MediaStreamTrack) => {
    const ops: Promise<void>[] = [];
    peersRef.current.forEach((entry) => {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) ops.push(sender.replaceTrack(track));
    });
    await Promise.all(ops);
  }, []);

  const setSelectedMicId = useCallback(
    async (deviceId: string | null) => {
      micDeviceIdRef.current = deviceId ?? undefined;
      setSelectedMicIdState(deviceId);
      const stream = localStreamRef.current;
      if (!stream) return;
      const micOn = stateRef.current?.micOn ?? true;
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: buildAudioConstraints(),
          video: false,
        });
        const track = next.getAudioTracks()[0];
        if (!track) return;
        track.enabled = micOn;
        const old = stream.getAudioTracks()[0];
        if (old && old.id !== track.id) {
          stream.removeTrack(old);
          old.stop();
        }
        if (!stream.getAudioTracks().includes(track)) stream.addTrack(track);
        await replaceAudioTrackOnAllPeers(track);
        await refreshDeviceList();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not switch microphone";
        setState((s) => ({ ...s, error: msg }));
      }
    },
    [buildAudioConstraints, replaceAudioTrackOnAllPeers, refreshDeviceList],
  );

  const setSelectedCamId = useCallback(
    async (deviceId: string | null) => {
      camDeviceIdRef.current = deviceId ?? undefined;
      setSelectedCamIdState(deviceId);
      const stream = localStreamRef.current;
      if (!stream) return;
      const camOn = stateRef.current?.camOn ?? true;
      const screenOn = stateRef.current?.screenOn ?? false;
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: buildVideoConstraints(),
        });
        const track = next.getVideoTracks()[0];
        if (!track) return;
        track.enabled = camOn;
        const old = stream.getVideoTracks()[0];
        if (old && old.id !== track.id) {
          stream.removeTrack(old);
          old.stop();
        }
        if (!stream.getVideoTracks().includes(track)) stream.addTrack(track);
        cameraTrackRef.current = track;
        if (!screenOn) {
          await replaceVideoTrackOnAllPeers(track);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }
        await refreshDeviceList();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not switch camera";
        setState((s) => ({ ...s, error: msg }));
      }
    },
    [buildVideoConstraints, refreshDeviceList, replaceVideoTrackOnAllPeers],
  );

  const createPeerConnection = useCallback(
    (peerId: string, name: string, mode: IceMode = "direct"): PeerEntry => {
      const settings = loadSettings();
      const rtcConfig = buildRtcConfig(settings, mode);
      const pc = new RTCPeerConnection(rtcConfig);
      const remoteStream = new MediaStream();

      const entry: PeerEntry = {
        pc,
        name,
        stream: remoteStream,
        mode,
        relayFallbackTried: false,
        pendingIce: [],
      };
      peersRef.current.set(peerId, entry);

      // Push our local tracks onto the new connection.
      const local = localStreamRef.current;
      if (local) {
        local.getTracks().forEach((t) => pc.addTrack(t, local));
      }

      pc.ontrack = (ev) => {
        ev.streams[0]?.getTracks().forEach((t) => {
          if (!remoteStream.getTracks().includes(t)) remoteStream.addTrack(t);
        });
        refreshPeers();
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && signalingRef.current) {
          void signalingRef.current.send(peerId, "ice", ev.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        refreshPeers();
        if (pc.connectionState === "failed") {
          const latest = peersRef.current.get(peerId);
          const canFallback = !!latest && latest.mode !== "relay" && !latest.relayFallbackTried;
          if (canFallback) {
            latest.relayFallbackTried = true;
            latest.mode = "relay";
            try {
              const relayConfig = buildRtcConfig(settings, "relay");
              latest.pc.setConfiguration(relayConfig);
              latest.pc.restartIce();
              const selfId = selfIdRef.current;
              if (selfId && selfId > peerId && signalingRef.current) {
                void (async () => {
                  try {
                    const offer = await latest.pc.createOffer({ iceRestart: true });
                    await latest.pc.setLocalDescription(offer);
                    await signalingRef.current?.send(peerId, "offer", {
                      sdp: latest.pc.localDescription,
                    });
                  } catch {
                    /* ignore fallback re-offer failure */
                  }
                })();
              }
            } catch {
              /* ignore fallback config errors */
            }
            return;
          }
          setState((s) => ({ ...s, error: `Connection to ${name} failed (NAT/firewall)` }));
        }
      };

      return entry;
    },
    [refreshPeers],
  );

  const closePeer = useCallback(
    (peerId: string) => {
      const entry = peersRef.current.get(peerId);
      if (!entry) return;
      entry.pc.getSenders().forEach((s) => s.track && s.track.kind === "video" && undefined);
      entry.pc.close();
      entry.stream.getTracks().forEach((t) => t.stop());
      peersRef.current.delete(peerId);
      refreshPeers();
    },
    [refreshPeers],
  );

  const initiateCallTo = useCallback(
    async (peerId: string, name: string) => {
      if (peersRef.current.has(peerId)) return;
      const settings = loadSettings();
      const mode: IceMode = settings.forceRelay ? "relay" : "direct";
      const { pc } = createPeerConnection(peerId, name, mode);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signalingRef.current?.send(peerId, "offer", { sdp: pc.localDescription });
    },
    [createPeerConnection],
  );

  const handleSignal = useCallback(
    async (msg: SignalMessage, peerName: string) => {
      if (msg.type === "chat") return;
      const { from, type, payload } = msg;
      let entry = peersRef.current.get(from);

      if (type === "offer") {
        if (!entry) {
          const settings = loadSettings();
          const mode: IceMode = settings.forceRelay ? "relay" : "direct";
          entry = createPeerConnection(from, peerName, mode);
        }
        const { sdp } = payload as { sdp: RTCSessionDescriptionInit };
        await entry.pc.setRemoteDescription(sdp);
        await flushPendingIce(entry);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        await signalingRef.current?.send(from, "answer", { sdp: entry.pc.localDescription });
      } else if (type === "answer" && entry) {
        const { sdp } = payload as { sdp: RTCSessionDescriptionInit };
        if (entry.pc.signalingState !== "stable") {
          await entry.pc.setRemoteDescription(sdp);
          await flushPendingIce(entry);
        }
      } else if (type === "ice" && entry) {
        const cand = payload as RTCIceCandidateInit | null | undefined;
        if (cand == null) return;
        const line = typeof cand.candidate === "string" ? cand.candidate.trim() : "";
        if (line === "") return;
        if (!entry.pc.remoteDescription) {
          entry.pendingIce.push(cand);
        } else {
          try {
            await entry.pc.addIceCandidate(cand);
          } catch {
            if (!entry.pc.remoteDescription) entry.pendingIce.push(cand);
          }
        }
      } else if (type === "bye") {
        closePeer(from);
      }
    },
    [createPeerConnection, closePeer],
  );

  const onPoll = useCallback(
    async ({ peers, messages }: { peers: PeerInfo[]; messages: SignalMessage[] }) => {
      const selfId = selfIdRef.current!;
      const known = peersRef.current;

      for (const m of messages) {
        if (m.type === "chat") {
          const pl = m.payload as { text?: unknown } | null | undefined;
          const raw = typeof pl?.text === "string" ? pl.text : "";
          const text = raw.trim();
          if (!text) continue;
          const fromName = peers.find((p) => p.id === m.from)?.name ?? "Peer";
          chatSeqRef.current += 1;
          const key = `c-${m.from}-${chatSeqRef.current}`;
          setChatMessages((prev) =>
            [
              ...prev,
              {
                key,
                fromPeerId: m.from,
                fromName,
                text,
                at: Date.now(),
                isSelf: m.from === selfId,
              },
            ].slice(-MAX_CHAT_LINES),
          );
        }
      }

      const signals = sortSignalMessages(messages.filter((m) => m.type !== "chat"));
      for (const m of signals) {
        const peerName = peers.find((p) => p.id === m.from)?.name ?? "Peer";
        await handleSignal(m, peerName);
      }

      // For any new peer in the roster we haven't connected to yet,
      // the higher-ID peer initiates the offer (deterministic tie-break).
      for (const p of peers) {
        if (!known.has(p.id) && selfId > p.id) {
          await initiateCallTo(p.id, p.name);
        }
      }

      // Drop peers no longer in the roster.
      const liveIds = new Set(peers.map((p) => p.id));
      known.forEach((_, id) => {
        if (!liveIds.has(id)) closePeer(id);
      });
    },
    [handleSignal, initiateCallTo, closePeer],
  );

  const joinRoom = useCallback(
    async (room: string) => {
      const settings = loadSettings();
      if (!settings.signalingUrl.trim()) {
        throw new Error("Set the Signaling URL in Settings first.");
      }
      const name = settings.displayName.trim() || "Guest";
      const peerId = randomId(10);
      selfIdRef.current = peerId;
      setChatMessages([]);

      setState((s) => ({
        ...s,
        status: "preparing",
        roomCode: room,
        selfId: peerId,
        error: null,
        peers: [],
      }));

      try {
        await ensureMedia();
        const client = new SignalingClient({
          url: settings.signalingUrl,
          room,
          peerId,
          name,
          onPoll,
          onError: (e) => setState((s) => ({ ...s, error: e.message })),
        });
        signalingRef.current = client;
        await client.join();
        setState((s) => ({ ...s, status: "in-call", startedAt: Date.now() }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to join room";
        setState((s) => ({ ...s, status: "failed", error: msg }));
        throw e;
      }
    },
    [ensureMedia, onPoll],
  );

  const leave = useCallback(async () => {
    const ids = [...peersRef.current.keys()];
    for (const id of ids) {
      try {
        await signalingRef.current?.send(id, "bye", null);
      } catch {
        /* noop */
      }
      closePeer(id);
    }
    await signalingRef.current?.leave();
    signalingRef.current = null;
    selfIdRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    cameraTrackRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    setChatMessages([]);
    setState({
      status: "idle",
      roomCode: null,
      selfId: null,
      micOn: true,
      camOn: true,
      screenOn: false,
      startedAt: null,
      error: null,
      peers: [],
    });
  }, [closePeer]);

  const leaveForPageUnload = useCallback(() => {
    const ids = [...peersRef.current.keys()];
    for (const id of ids) {
      closePeer(id);
    }
    signalingRef.current?.leaveNow();
    signalingRef.current = null;
    selfIdRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    cameraTrackRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, [closePeer]);

  const sendChatMessage = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || !signalingRef.current || !selfIdRef.current) return;
    const settings = loadSettings();
    const selfName = settings.displayName.trim() || "Guest";
    chatSeqRef.current += 1;
    const key = `me-${selfIdRef.current}-${chatSeqRef.current}-${randomId(4)}`;
    setChatMessages((prev) =>
      [
        ...prev,
        {
          key,
          fromPeerId: selfIdRef.current!,
          fromName: selfName,
          text: t,
          at: Date.now(),
          isSelf: true,
        },
      ].slice(-MAX_CHAT_LINES),
    );
    try {
      await signalingRef.current.sendChat(t);
    } catch (e) {
      setChatMessages((prev) => prev.filter((m) => m.key !== key));
      toast.error(e instanceof Error ? e.message : "Could not send message");
    }
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setState((s) => {
      const next = !s.micOn;
      stream.getAudioTracks().forEach((t) => (t.enabled = next));
      return { ...s, micOn: next };
    });
  }, []);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setState((s) => {
      const next = !s.camOn;
      stream.getVideoTracks().forEach((t) => (t.enabled = next));
      return { ...s, camOn: next };
    });
  }, []);

  const toggleScreen = useCallback(async () => {
    if (state.screenOn) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const cam = cameraTrackRef.current;
      if (cam) await replaceVideoTrackOnAllPeers(cam);
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setState((s) => ({ ...s, screenOn: false }));
    } else {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = display;
        const track = display.getVideoTracks()[0];
        await replaceVideoTrackOnAllPeers(track);
        track.onended = () => void toggleScreen();
        if (localVideoRef.current) localVideoRef.current.srcObject = display;
        setState((s) => ({ ...s, screenOn: true }));
      } catch {
        /* user cancelled */
      }
    }
  }, [state.screenOn, replaceVideoTrackOnAllPeers]);

  useEffect(() => () => void leave(), [leave]);

  return {
    ...state,
    audioInputs,
    videoInputs,
    selectedMicId,
    selectedCamId,
    setSelectedMicId,
    setSelectedCamId,
    refreshDeviceList,
    chatMessages,
    sendChatMessage,
    localVideoRef,
    joinRoom,
    leave,
    leaveForPageUnload,
    toggleMic,
    toggleCam,
    toggleScreen,
  };
}

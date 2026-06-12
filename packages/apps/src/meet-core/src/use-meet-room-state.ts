import { useEffect, useMemo, useRef, useState } from "react";
import type { MeetChatLine } from "@/meet-core/src/meet-chat-line";
import type { MeetCallStatus, MeetRemotePeer } from "@/meet-core/src/meet-call-types";
import type { MeetKnocker } from "@/meet-core/src/meet-poll-roster";
import type { PeerInboundSample } from "@/meet-core/src/meet-inbound-media-hints";

export type UseMeetRoomStateArgs = {
  defaultDisplayName: string;
  sessionDisplayName: string;
  buildCallLink?: (roomCode: string) => string;
  onRoomChange?: (roomCode: string | null) => void;
};

export function useMeetRoomState({
  defaultDisplayName,
  sessionDisplayName,
  buildCallLink,
  onRoomChange,
}: UseMeetRoomStateArgs) {
  const [status, setStatus] = useState<MeetCallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(
    defaultDisplayName || sessionDisplayName || "Guest",
  );
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [peers, setPeers] = useState<MeetRemotePeer[]>([]);
  const [chatMessages, setChatMessages] = useState<MeetChatLine[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [knockers, setKnockers] = useState<MeetKnocker[]>([]);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);

  const participantRosterDiffReadyRef = useRef(false);
  const selfIdRef = useRef<string | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const statusRef = useRef<MeetCallStatus>("idle");
  const displayNameRef = useRef(displayName);
  const waitingForAdmissionRef = useRef(false);
  const rosterRef = useRef<Map<string, string>>(new Map());
  const peerInboundSampleRef = useRef<Map<string, PeerInboundSample>>(new Map());
  const peerMediaHintRef = useRef<Map<string, { camera: boolean; mic: boolean }>>(new Map());
  const peerDisclosedMediaRef = useRef<
    Map<string, { mic: boolean; camera: boolean; screen?: boolean }>
  >(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const micOnRef = useRef(micOn);
  const videoOnRef = useRef(videoOn);
  const screenOnRef = useRef(screenOn);
  const refreshPeersRef = useRef<() => void>(() => {});

  statusRef.current = status;
  displayNameRef.current = displayName;
  selfIdRef.current = selfId;
  roomCodeRef.current = roomCode;
  waitingForAdmissionRef.current = waitingForAdmission;
  micOnRef.current = micOn;
  videoOnRef.current = videoOn;
  screenOnRef.current = screenOn;

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const callLink = useMemo(() => {
    if (!roomCode) return "";
    if (buildCallLink) return buildCallLink(roomCode);
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (/\/meet\/guest\/?$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/meet\/guest\/?$/, "/meet/guest");
    } else if (/\/meet\/?$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/meet\/?$/, "/meet/guest");
    } else {
      url.pathname = "/meet/guest";
    }
    url.searchParams.set("room", roomCode);
    return url.toString();
  }, [buildCallLink, roomCode]);

  useEffect(() => {
    onRoomChange?.(roomCode);
  }, [onRoomChange, roomCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!roomCode) return;
    const next = new URL(window.location.href);
    next.searchParams.set("room", roomCode);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const nextUrl = `${next.pathname}${next.search}${next.hash}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [roomCode]);

  const elapsedLabel = useMemo(() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, [elapsedSeconds]);

  function resetPeerMaps() {
    rosterRef.current = new Map();
    peerNamesRef.current = new Map();
    participantRosterDiffReadyRef.current = false;
    peerDisclosedMediaRef.current.clear();
  }

  function resetIdleMediaDefaults() {
    setScreenOn(false);
    setMicOn(true);
    setVideoOn(true);
  }

  return {
    status,
    setStatus,
    error,
    setError,
    roomCode,
    setRoomCode,
    selfId,
    setSelfId,
    displayName,
    setDisplayName,
    micOn,
    setMicOn,
    videoOn,
    setVideoOn,
    screenOn,
    setScreenOn,
    startedAt,
    setStartedAt,
    peers,
    setPeers,
    chatMessages,
    setChatMessages,
    elapsedSeconds,
    setElapsedSeconds,
    waitingForAdmission,
    setWaitingForAdmission,
    knockers,
    setKnockers,
    endedMessage,
    setEndedMessage,
    participantRosterDiffReadyRef,
    selfIdRef,
    roomCodeRef,
    statusRef,
    displayNameRef,
    waitingForAdmissionRef,
    rosterRef,
    peerInboundSampleRef,
    peerMediaHintRef,
    peerDisclosedMediaRef,
    peerNamesRef,
    micOnRef,
    videoOnRef,
    screenOnRef,
    refreshPeersRef,
    callLink,
    elapsedLabel,
    inCall: status === "in-call" || status === "preparing",
    resetPeerMaps,
    resetIdleMediaDefaults,
  };
}

export type MeetRoomState = ReturnType<typeof useMeetRoomState>;

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { useCallback, useEffect, useRef, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import { useOnReconnect } from "@/hooks/use-connectivity";
import { getConnectivitySnapshot, isFetchNetworkError } from "@/lib/offline/browser-online";
import { applyRtcDebugOverrides } from "@/lib/rtc/force-relay";
import { DEFAULT_RTC_SETTINGS } from "@/lib/rtc/types";
import { docsEditorFormatFromFileName } from "@/docs-core/src/docs-editor-format";
import { applyContentSeedToYDoc } from "./docs-collab-editor-surface";
import type { TextEditorContentFormat } from "@/text-editor-core/src/text-editor-content";
import { clearDocsCollabSyncState, setDocsCollabSyncState } from "./docs-collab-sync-registry";
import { DEFAULT_DOCS_COLLAB_WIRE, type DocsCollabWireOperations } from "./docs-collab-wire";
import { DocsRtcSession } from "./docs-rtc-session";
import type { DocsCollabMeshMessage, DocsCollabMeshPeer } from "./docs-collab-types";

export const MESH_ORIGIN = "mesh";
export const SEED_ORIGIN = "seed";
export const SERVER_ORIGIN = "server";
export const IDB_ORIGIN = "idb";

const REMOTE_UPDATE_ORIGINS = new Set<string>([
  MESH_ORIGIN,
  SEED_ORIGIN,
  SERVER_ORIGIN,
  IDB_ORIGIN,
]);
const SAVE_DELAY_MS = 2000;
const PEER_FAILURE_WARNING_DELAY_MS = 6000;
const PENDING_SERVER_SAVE_KEY = "pendingServerSave";
const SAVE_RETRY_MAX_MS = 30000;
const ROOM_SERVER_BACKOFF_INITIAL_MS = 3000;
const ROOM_SERVER_BACKOFF_MAX_MS = 30000;

type RoomServerBackoff = {
  retryMs: number;
  nextAttemptAt: number;
};

const roomServerBackoff = new Map<string, RoomServerBackoff>();

/** Test helper to clear per-room backoff state. */
export function resetDocsCollabBackoffForTests(): void {
  roomServerBackoff.clear();
}

function roomServerAllowed(room: string): boolean {
  const backoff = roomServerBackoff.get(room);
  return !backoff || Date.now() >= backoff.nextAttemptAt;
}

function markRoomServerSuccess(room: string): void {
  roomServerBackoff.delete(room);
}

function markRoomServerFailure(room: string): void {
  const now = Date.now();
  const prev = roomServerBackoff.get(room);
  const retryMs = prev
    ? Math.min(prev.retryMs * 2, ROOM_SERVER_BACKOFF_MAX_MS)
    : ROOM_SERVER_BACKOFF_INITIAL_MS;
  roomServerBackoff.set(room, { retryMs, nextAttemptAt: now + retryMs });
}

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#ea580c",
];

export type DocsCollabUrls = {
  signalUrl: string;
  collabApiBaseUrl?: string;
  collabRtcUrl?: string;
  documentUrl: string;
  yjsUrl: string;
  room?: string;
  authToken?: string;
  authTokenUrl?: string;
  authUser?: string;
  authPassword?: string;
  documentSaveMethod?: "POST" | "PUT";
};

export const DEFAULT_DOCS_COLLAB_URLS: DocsCollabUrls = {
  signalUrl: "/api/v1/rooms/f_ZG9jcy90ZXN0LXRvZ2V0aGVyLm1k/events",
  collabApiBaseUrl: "/api/v1/rooms",
  collabRtcUrl: "/api/v1/rooms/f_ZG9jcy90ZXN0LXRvZ2V0aGVyLm1k/configuration",
  documentUrl: "/api/v1/files/collaboration?path=docs%2Ftest-together.md",
  yjsUrl: "/api/v1/files/collaboration?path=docs%2Ftest-together.md&format=yjs",
  documentSaveMethod: "PUT",
  room: "docs/test-together.md",
};

export type DocsCollabSession = {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  user: { name: string; color: string };
};

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

function isYDocEmpty(doc: Y.Doc): boolean {
  return doc.getXmlFragment("default").length === 0;
}

function collabDocumentFormat(room: string | undefined): TextEditorContentFormat {
  const fileName = room?.split("/").pop() ?? "";
  const format = docsEditorFormatFromFileName(fileName);
  return format === "markdown" ? "markdown" : "text";
}

function withBearerAuth(
  headers: Record<string, string>,
  authToken?: string,
): Record<string, string> {
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

function isRemoteUpdateOrigin(origin: unknown, persistence: IndexeddbPersistence | null): boolean {
  if (typeof origin === "string" && REMOTE_UPDATE_ORIGINS.has(origin)) return true;
  if (origin === persistence) return true;
  return false;
}

async function loadMarkdown(documentUrl: string, authToken?: string): Promise<string> {
  const res = await fetch(documentUrl, {
    headers: withBearerAuth({}, authToken),
  });
  if (!res.ok) throw new Error(`Could not load document (${res.status})`);
  return res.text();
}

async function loadYjsSnapshot(
  yjsUrl: string,
  target: Y.Doc,
  authToken?: string,
  origin: string = SERVER_ORIGIN,
): Promise<boolean> {
  const res = await fetch(yjsUrl, {
    headers: withBearerAuth({}, authToken),
  });
  if (res.status === 204 || !res.ok) return false;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length === 0) return false;
  Y.applyUpdate(target, buf, origin);
  return true;
}

async function saveDocument(
  documentUrl: string,
  markdown: string,
  ydoc: Y.Doc,
  room: string | undefined,
  authToken?: string,
  method: "POST" | "PUT" = "POST",
): Promise<void> {
  const body: { markdown: string; yjs: number[]; room?: string } = {
    markdown,
    yjs: Array.from(Y.encodeStateAsUpdate(ydoc)),
  };
  if (room) body.room = room;

  const res = await fetch(documentUrl, {
    method,
    headers: withBearerAuth({ "Content-Type": "application/json" }, authToken),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let err = text;
    try {
      err = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      // ignore
    }
    throw new Error(err || res.statusText);
  }
}

export type UseDocsCollabOptions = {
  userName: string;
  autoJoin?: boolean;
  urls?: DocsCollabUrls;
  wire?: DocsCollabWireOperations;
};

export function useDocsCollab({
  userName,
  autoJoin = true,
  urls: inputUrls = DEFAULT_DOCS_COLLAB_URLS,
  wire = DEFAULT_DOCS_COLLAB_WIRE,
}: UseDocsCollabOptions) {
  const urls: DocsCollabUrls = {
    ...DEFAULT_DOCS_COLLAB_URLS,
    ...(inputUrls ?? {}),
  };
  const room = urls.room ?? "docs/test-together.md";
  const documentFormat = collabDocumentFormat(room);
  const meshRef = useRef<DocsRtcSession | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const pendingMarkdownRef = useRef("");
  const seedDoneRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getMarkdownRef = useRef<(() => string) | null>(null);
  const joinGenerationRef = useRef(0);
  const reconnectGenerationRef = useRef(0);
  const authTokenRef = useRef<string | undefined>(undefined);
  const failedSinceRef = useRef<Map<string, number>>(new Map());
  const saveFailedRef = useRef(false);
  const wireRef = useRef(wire);
  const joinedRoomRef = useRef<string | null>(null);
  const reconnectInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveRetryMsRef = useRef(0);
  const nextSaveAttemptAtRef = useRef(0);

  const [session, setSession] = useState<DocsCollabSession | null>(null);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [docStatus, setDocStatus] = useState("");
  const [peers, setPeers] = useState<DocsCollabMeshPeer[]>([]);
  const [connectingPeers, setConnectingPeers] = useState<DocsCollabMeshPeer[]>([]);
  const [warningPeers, setWarningPeers] = useState<DocsCollabMeshPeer[]>([]);
  const [linkCount, setLinkCount] = useState(0);
  const [pendingSync, setPendingSync] = useState(false);
  const [failedSync, setFailedSync] = useState(false);
  const sessionRef = useRef<DocsCollabSession | null>(null);

  useEffect(() => {
    wireRef.current = wire;
  }, [wire]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const updatePendingState = useCallback(
    async (pending: boolean, failed = false) => {
      setPendingSync(pending);
      setFailedSync(pending && failed && getConnectivitySnapshot());
      setDocsCollabSyncState(room, {
        pendingServerSave: pending,
        failedSync: pending && failed && getConnectivitySnapshot(),
      });
      const persistence = persistenceRef.current;
      if (!persistence) return;
      if (pending) await persistence.set(PENDING_SERVER_SAVE_KEY, 1);
      else await persistence.del(PENDING_SERVER_SAVE_KEY);
    },
    [room],
  );

  const refreshMeshUi = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const roomPeerStatuses = mesh.getRoomPeerStatuses();
    const connectedPeers = roomPeerStatuses
      .filter((peer) => peer.link === "connected")
      .map(({ id, name }) => ({ id, name }));
    const pendingPeers = roomPeerStatuses
      .filter((peer) => peer.link !== "connected")
      .map(({ id, name }) => ({ id, name }));
    const now = Date.now();
    const failedNow = new Set<string>();
    const warning: DocsCollabMeshPeer[] = [];
    for (const peer of roomPeerStatuses) {
      if (peer.link === "failed" || peer.link === "disconnected" || peer.link === "closed") {
        failedNow.add(peer.id);
        const failedSince = failedSinceRef.current.get(peer.id) ?? now;
        failedSinceRef.current.set(peer.id, failedSince);
        if (now - failedSince >= PEER_FAILURE_WARNING_DELAY_MS) {
          warning.push({ id: peer.id, name: peer.name });
        }
      } else {
        failedSinceRef.current.delete(peer.id);
      }
    }
    for (const trackedId of [...failedSinceRef.current.keys()]) {
      if (!failedNow.has(trackedId) && !roomPeerStatuses.some((peer) => peer.id === trackedId)) {
        failedSinceRef.current.delete(trackedId);
      }
    }
    setLinkCount(mesh.linkCount());
    setPeers(connectedPeers);
    setConnectingPeers(pendingPeers);
    setWarningPeers(warning);
    setStatus(
      `Mesh · ${mesh.getMyName()} · ${mesh.getMyId()?.slice(0, 8) ?? "—"}… · ${roomPeerStatuses.length} peer(s) in room · ${mesh.linkCount()} link(s)`,
    );
  }, []);

  const markDocReady = useCallback(() => {
    seedDoneRef.current = true;
  }, []);

  const persistToServer = useCallback(async (): Promise<void> => {
    if (saveInFlightRef.current) return;
    const ydoc = ydocRef.current;
    const getMd = getMarkdownRef.current;
    if (!ydoc || !getMd) return;
    saveInFlightRef.current = true;
    try {
      await saveDocument(
        urls.documentUrl,
        getMd(),
        ydoc,
        urls.room,
        authTokenRef.current,
        urls.documentSaveMethod ?? "POST",
      );
      markRoomServerSuccess(room);
      saveFailedRef.current = false;
      saveRetryMsRef.current = 0;
      nextSaveAttemptAtRef.current = 0;
      await updatePendingState(false, false);
      setDocStatus(`Saved · ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      saveFailedRef.current = true;
      const nextRetryMs = Math.min(
        Math.max(saveRetryMsRef.current || SAVE_DELAY_MS, SAVE_DELAY_MS) * 2,
        SAVE_RETRY_MAX_MS,
      );
      saveRetryMsRef.current = nextRetryMs;
      nextSaveAttemptAtRef.current = Date.now() + nextRetryMs;
      markRoomServerFailure(room);
      await updatePendingState(true, true);
      setDocStatus(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    } finally {
      saveInFlightRef.current = false;
    }
  }, [room, updatePendingState, urls.documentSaveMethod, urls.documentUrl, urls.room]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const retryDelayMs = Math.max(nextSaveAttemptAtRef.current - Date.now(), 0);
    const delayMs = Math.max(SAVE_DELAY_MS, retryDelayMs);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistToServer().catch(() => undefined);
    }, delayMs);
  }, [persistToServer]);

  const trySeedFromFile = useCallback(() => {
    const ydoc = ydocRef.current;
    const mesh = meshRef.current;
    const markdown = pendingMarkdownRef.current;
    if (!ydoc || !markdown || seedDoneRef.current) return;
    if (!isYDocEmpty(ydoc)) {
      markDocReady();
      return;
    }

    if (!mesh) {
      applyContentSeedToYDoc(ydoc, markdown, documentFormat);
      markDocReady();
      setDocStatus("Loaded shared document");
      return;
    }

    const hasOthers = mesh.getPeerIds().length > 0;
    if (hasOthers) {
      const my = mesh.getMyId();
      if (!my) return;
      let min = my;
      for (const id of mesh.getPeerIds()) {
        if (id < min) min = id;
      }
      if (my !== min) return;
      if (mesh.linkCount() === 0) return;
    }

    applyContentSeedToYDoc(ydoc, markdown, documentFormat);
    markDocReady();
    setDocStatus("Loaded shared document");
  }, [documentFormat, markDocReady]);

  const sendSyncStep1 = useCallback((toPeerId?: string) => {
    const ydoc = ydocRef.current;
    const mesh = meshRef.current;
    if (!ydoc || !mesh) return;
    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, ydoc);
    const msg = { type: "sync" as const, u: Array.from(encoding.toUint8Array(encoder)) };
    if (toPeerId) mesh.sendTo(toPeerId, msg);
    else mesh.broadcast(msg);
  }, []);

  const handleMeshMessage = useCallback(
    (msg: DocsCollabMeshMessage) => {
      const ydoc = ydocRef.current;
      const awareness = awarenessRef.current;
      if (!ydoc || !awareness) return;

      if (msg.type === "sync" && Array.isArray(msg.u)) {
        const decoder = decoding.createDecoder(Uint8Array.from(msg.u));
        const encoder = encoding.createEncoder();
        syncProtocol.readSyncMessage(decoder, encoder, ydoc, MESH_ORIGIN);
        if (!isYDocEmpty(ydoc)) markDocReady();
        if (encoding.length(encoder) > 1) {
          const reply = { type: "sync" as const, u: Array.from(encoding.toUint8Array(encoder)) };
          if (msg.from) meshRef.current?.sendTo(msg.from, reply);
          else meshRef.current?.broadcast(reply);
        }
      }
      if (msg.type === "awareness" && Array.isArray(msg.u)) {
        awarenessProtocol.applyAwarenessUpdate(awareness, Uint8Array.from(msg.u), MESH_ORIGIN);
      }
      if (msg.type === "dc-open" && msg.from) {
        sendSyncStep1(msg.from);
        trySeedFromFile();
      }
      refreshMeshUi();
    },
    [markDocReady, refreshMeshUi, sendSyncStep1, trySeedFromFile],
  );

  const joinMesh = useCallback(
    async (name: string, authToken: string): Promise<DocsCollabMeshPeer[]> => {
      let rtcSettings;
      try {
        rtcSettings = await wireRef.current.fetchRtcSettings({
          url: urls.collabRtcUrl,
          bearerToken: authToken,
          channel: "collab",
        });
      } catch (error) {
        console.warn("[docs-collab] rtc settings unavailable", error);
        rtcSettings = await DEFAULT_DOCS_COLLAB_WIRE.fetchRtcSettings({ channel: "collab" });
      }

      const mesh = new DocsRtcSession({
        apiBase: urls.collabApiBaseUrl ?? "/api/v1/rooms",
        room,
        authToken,
        rtcSettings:
          rtcSettings ?? applyRtcDebugOverrides({ ...DEFAULT_RTC_SETTINGS, forceRelay: false }),
      });
      meshRef.current = mesh;
      mesh.onMessage(handleMeshMessage);
      const joinedData = await mesh.join(name);
      refreshMeshUi();
      return joinedData.peers;
    },
    [handleMeshMessage, refreshMeshUi, room, urls.collabApiBaseUrl, urls.collabRtcUrl],
  );

  const teardown = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (seedTimerRef.current) clearTimeout(seedTimerRef.current);
    const mesh = meshRef.current;
    meshRef.current = null;
    void mesh?.leave();
    const persistence = persistenceRef.current;
    persistenceRef.current = null;
    void persistence?.destroy();
    ydocRef.current = null;
    awarenessRef.current = null;
    authTokenRef.current = undefined;
    seedDoneRef.current = false;
    saveFailedRef.current = false;
    saveInFlightRef.current = false;
    saveRetryMsRef.current = 0;
    nextSaveAttemptAtRef.current = 0;
    reconnectInFlightRef.current = false;
    joinedRoomRef.current = null;
    clearDocsCollabSyncState(room);
    setSession(null);
    setJoined(false);
    setPeers([]);
    setConnectingPeers([]);
    setWarningPeers([]);
    failedSinceRef.current.clear();
    setLinkCount(0);
    setStatus("Disconnected");
    setDocStatus("");
    setPendingSync(false);
    setFailedSync(false);
  }, [room]);

  const mergeServerState = useCallback(
    async (authToken: string | undefined): Promise<boolean> => {
      const ydoc = ydocRef.current;
      if (!ydoc) return false;
      return loadYjsSnapshot(urls.yjsUrl, ydoc, authToken, SERVER_ORIGIN);
    },
    [urls.yjsUrl],
  );

  const handleReconnect = useCallback(async () => {
    if (reconnectInFlightRef.current) return;
    const generation = ++reconnectGenerationRef.current;
    const ydoc = ydocRef.current;
    const persistence = persistenceRef.current;
    if (!ydoc || !persistence || !joined) return;
    if (!roomServerAllowed(room)) return;
    reconnectInFlightRef.current = true;

    setDocStatus("Reconnecting…");
    const authToken = authTokenRef.current;

    try {
      await mergeServerState(authToken);
      markRoomServerSuccess(room);
      if (generation !== reconnectGenerationRef.current) return;

      if (!meshRef.current && authToken) {
        const name = userName.trim();
        if (name) {
          const meshPeers = await joinMesh(name, authToken);
          if (generation !== reconnectGenerationRef.current) return;
          setConnectingPeers(meshPeers);
        }
      }

      const pendingSave = await persistence.get(PENDING_SERVER_SAVE_KEY);
      if (pendingSave) {
        await persistToServer();
      } else {
        setDocStatus("");
      }
    } catch (error) {
      markRoomServerFailure(room);
      console.warn("[docs-collab] reconnect failed", error);
      setDocStatus(error instanceof Error ? error.message : String(error));
    } finally {
      reconnectInFlightRef.current = false;
    }
  }, [joinMesh, joined, mergeServerState, persistToServer, room, userName]);

  useOnReconnect(() => {
    if (session) void handleReconnect();
  });

  const applyServerBootstrap = useCallback(
    async (generation: number, authToken: string | undefined) => {
      const ydoc = ydocRef.current;
      if (!ydoc || generation !== joinGenerationRef.current) return;

      let markdown = "";
      let hadSnapshot = false;
      try {
        markdown = await loadMarkdown(urls.documentUrl, authToken);
      } catch (error) {
        markRoomServerFailure(room);
        console.warn("[docs-collab] markdown load failed", error);
      }
      if (generation !== joinGenerationRef.current) return;
      try {
        hadSnapshot = await loadYjsSnapshot(urls.yjsUrl, ydoc, authToken, SERVER_ORIGIN);
      } catch (error) {
        markRoomServerFailure(room);
        console.warn("[docs-collab] yjs load failed", error);
      }
      if (generation !== joinGenerationRef.current) return;
      if (hadSnapshot) seedDoneRef.current = true;
      if (hadSnapshot || markdown) {
        markRoomServerSuccess(room);
      }

      pendingMarkdownRef.current = markdown;

      if (!seedDoneRef.current && isYDocEmpty(ydoc)) {
        const mesh = meshRef.current;
        if (!mesh || mesh.getPeerIds().length === 0) {
          if (markdown) {
            applyContentSeedToYDoc(ydoc, markdown, documentFormat);
            markDocReady();
            setDocStatus("Loaded shared document");
          }
        } else {
          const tick = () => trySeedFromFile();
          seedTimerRef.current = setTimeout(tick, 1000);
          setTimeout(tick, 3000);
        }
      } else if (hadSnapshot) {
        setDocStatus("Restored Yjs snapshot");
      }
    },
    [documentFormat, markDocReady, room, trySeedFromFile, urls.documentUrl, urls.yjsUrl],
  );

  const connectMeshInBackground = useCallback(
    async (generation: number, name: string, authToken: string) => {
      setDocStatus((prev) => prev || "Connecting to collaborators…");
      setStatus("Connecting to mesh…");
      try {
        const meshPeers = await joinMesh(name, authToken);
        if (generation !== joinGenerationRef.current) return;
        setConnectingPeers(meshPeers);
        refreshMeshUi();
        setDocStatus((prev) => (prev === "Connecting to collaborators…" ? "" : prev));
        trySeedFromFile();
      } catch (error) {
        if (generation !== joinGenerationRef.current) return;
        markRoomServerFailure(room);
        console.warn("[docs-collab] mesh join failed", error);
        setDocStatus(error instanceof Error ? error.message : String(error));
      }
    },
    [joinMesh, refreshMeshUi, room, trySeedFromFile],
  );

  const join = useCallback(async () => {
    if (joinedRoomRef.current === room && sessionRef.current) return;
    const generation = ++joinGenerationRef.current;
    const name = userName.trim();
    if (!name) {
      setStatus("Enter a display name");
      return;
    }
    teardown();

    const online = getConnectivitySnapshot();
    const allowServerRequests = online && roomServerAllowed(room);
    seedDoneRef.current = false;
    setDocStatus("");

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const persistence = new IndexeddbPersistence(room, ydoc);
    persistenceRef.current = persistence;

    const authTokenPromise = allowServerRequests
      ? wireRef.current
          .fetchAuthToken({
            authToken: urls.authToken,
            authTokenUrl: urls.authTokenUrl,
            authUser: urls.authUser,
            authPassword: urls.authPassword,
          })
          .catch((error) => {
            markRoomServerFailure(room);
            if (online && !isFetchNetworkError(error)) throw error;
            console.warn("[docs-collab] auth unavailable, continuing with local cache", error);
            return undefined;
          })
      : Promise.resolve(undefined);

    await persistence.whenSynced;
    if (generation !== joinGenerationRef.current) return;

    const pendingSave = await persistence.get(PENDING_SERVER_SAVE_KEY);
    if (pendingSave) {
      saveFailedRef.current = true;
      await updatePendingState(true, true);
    }

    const awareness = new awarenessProtocol.Awareness(ydoc);
    awarenessRef.current = awareness;
    const user = { name, color: colorForName(name) };
    awareness.setLocalStateField("user", user);

    ydoc.on("update", (update, origin) => {
      if (isRemoteUpdateOrigin(origin, persistenceRef.current)) return;
      const encoder = encoding.createEncoder();
      syncProtocol.writeUpdate(encoder, update);
      meshRef.current?.broadcast({
        type: "sync",
        u: Array.from(encoding.toUint8Array(encoder)),
      });
    });

    awareness.on(
      "update",
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (origin === MESH_ORIGIN) return;
        const changed = added.concat(updated, removed);
        const encoded = awarenessProtocol.encodeAwarenessUpdate(awareness, changed);
        meshRef.current?.broadcast({ type: "awareness", u: Array.from(encoded) });
      },
    );

    setSession({ ydoc, awareness, user });
    setJoined(true);
    joinedRoomRef.current = room;

    if (!online || !allowServerRequests) {
      setStatus("Editing offline");
      setDocStatus(online ? "Server unavailable, using local draft" : "Editing offline");
      void authTokenPromise.then((token) => {
        if (generation !== joinGenerationRef.current) return;
        authTokenRef.current = token;
      });
      return;
    }

    void (async () => {
      let authToken: string | undefined;
      try {
        authToken = await authTokenPromise;
      } catch (error) {
        if (generation !== joinGenerationRef.current) return;
        setDocStatus(error instanceof Error ? error.message : String(error));
        return;
      }
      if (generation !== joinGenerationRef.current) return;
      authTokenRef.current = authToken;

      const tasks: Promise<void>[] = [applyServerBootstrap(generation, authToken)];
      if (authToken) {
        tasks.push(connectMeshInBackground(generation, name, authToken));
      }
      await Promise.all(tasks);
    })();
  }, [
    applyServerBootstrap,
    connectMeshInBackground,
    room,
    teardown,
    updatePendingState,
    urls.authPassword,
    urls.authToken,
    urls.authTokenUrl,
    urls.authUser,
    urls.documentUrl,
    urls.yjsUrl,
    userName,
  ]);

  const leave = useCallback(async () => {
    const getMd = getMarkdownRef.current;
    const ydoc = ydocRef.current;
    if (getMd && ydoc) {
      try {
        await saveDocument(
          urls.documentUrl,
          getMd(),
          ydoc,
          urls.room,
          authTokenRef.current,
          urls.documentSaveMethod ?? "POST",
        );
      } catch {
        // ignore
      }
    }
    await teardown();
  }, [teardown, urls.documentSaveMethod, urls.documentUrl, urls.room]);

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await persistToServer();
  }, [persistToServer]);

  const onMarkdownChange = useCallback(
    (getMarkdown: () => string) => {
      getMarkdownRef.current = getMarkdown;
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (autoJoin && userName.trim()) {
      void join().catch((error) => {
        console.warn("[docs-collab] join failed", error);
        setDocStatus(error instanceof Error ? error.message : String(error));
      });
    }
    return () => {
      joinGenerationRef.current += 1;
      teardown();
    };
  }, [autoJoin, join, teardown, userName]);

  return {
    session,
    joined,
    status,
    docStatus,
    peers,
    connectingPeers,
    warningPeers,
    linkCount,
    pendingSync,
    failedSync,
    join,
    leave,
    saveNow,
    onMarkdownChange,
  };
}

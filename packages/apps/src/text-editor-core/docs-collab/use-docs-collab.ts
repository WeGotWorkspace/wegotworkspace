import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { useCallback, useEffect, useRef, useState } from "react";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import { fetchRtcSettings, resolveRtcSettings } from "@/lib/api/wgw/rtc";
import { DEFAULT_RTC_SETTINGS } from "@/lib/rtc/types";
import { fetchWgwAuthToken } from "@/lib/api/wgw/auth-token";
import { applyContentSeedToYDoc } from "./docs-collab-editor-surface";
import type { TextEditorContentFormat } from "@/text-editor-core/src/text-editor-content";
import { DocsRtcSession } from "./docs-rtc-session";
import type { DocsCollabMeshMessage, DocsCollabMeshPeer } from "./docs-collab-types";

const MESH_ORIGIN = "mesh";
const SEED_ORIGIN = "seed";
const SAVE_DELAY_MS = 2000;
const PEER_FAILURE_WARNING_DELAY_MS = 6000;

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
  signalUrl: "/api/v1/collab/send",
  collabApiBaseUrl: "/api/v1/collab",
  collabRtcUrl: "/api/v1/collab/rtc",
  documentUrl: "/api/v1/collab/document",
  yjsUrl: "/api/v1/collab/document?format=yjs",
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
  return room?.toLowerCase().endsWith(".txt") ? "text" : "markdown";
}

function withBearerAuth(
  headers: Record<string, string>,
  authToken?: string,
): Record<string, string> {
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
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
): Promise<boolean> {
  const res = await fetch(yjsUrl, {
    headers: withBearerAuth({}, authToken),
  });
  if (res.status === 204 || !res.ok) return false;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length === 0) return false;
  Y.applyUpdate(target, buf, SEED_ORIGIN);
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
};

export function useDocsCollab({
  userName,
  autoJoin = true,
  urls: inputUrls = DEFAULT_DOCS_COLLAB_URLS,
}: UseDocsCollabOptions) {
  const urls: DocsCollabUrls = {
    ...DEFAULT_DOCS_COLLAB_URLS,
    ...(inputUrls ?? {}),
  };
  const documentFormat = collabDocumentFormat(urls.room);
  const meshRef = useRef<DocsRtcSession | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const pendingMarkdownRef = useRef("");
  const seedDoneRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getMarkdownRef = useRef<(() => string) | null>(null);
  const joinGenerationRef = useRef(0);
  const authTokenRef = useRef<string | undefined>(undefined);
  const failedSinceRef = useRef<Map<string, number>>(new Map());

  const [session, setSession] = useState<DocsCollabSession | null>(null);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [docStatus, setDocStatus] = useState("");
  const [peers, setPeers] = useState<DocsCollabMeshPeer[]>([]);
  const [connectingPeers, setConnectingPeers] = useState<DocsCollabMeshPeer[]>([]);
  const [warningPeers, setWarningPeers] = useState<DocsCollabMeshPeer[]>([]);
  const [linkCount, setLinkCount] = useState(0);

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

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const ydoc = ydocRef.current;
      const getMd = getMarkdownRef.current;
      if (!ydoc || !getMd) return;
      void saveDocument(
        urls.documentUrl,
        getMd(),
        ydoc,
        urls.room,
        authTokenRef.current,
        urls.documentSaveMethod ?? "POST",
      )
        .then(() => setDocStatus(`Saved · ${new Date().toLocaleTimeString()}`))
        .catch((err) =>
          setDocStatus(`Save failed: ${err instanceof Error ? err.message : String(err)}`),
        );
    }, SAVE_DELAY_MS);
  }, [urls.documentSaveMethod, urls.documentUrl, urls.room]);

  const trySeedFromFile = useCallback(() => {
    const ydoc = ydocRef.current;
    const mesh = meshRef.current;
    const markdown = pendingMarkdownRef.current;
    if (!ydoc || !mesh || !markdown || seedDoneRef.current) return;
    if (!isYDocEmpty(ydoc)) {
      markDocReady();
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

  const teardown = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (seedTimerRef.current) clearTimeout(seedTimerRef.current);
    const mesh = meshRef.current;
    meshRef.current = null;
    void mesh?.leave();
    ydocRef.current = null;
    awarenessRef.current = null;
    authTokenRef.current = undefined;
    seedDoneRef.current = false;
    setSession(null);
    setJoined(false);
    setPeers([]);
    setConnectingPeers([]);
    setWarningPeers([]);
    failedSinceRef.current.clear();
    setLinkCount(0);
    setStatus("Disconnected");
    setDocStatus("");
  }, []);

  const join = useCallback(async () => {
    const generation = ++joinGenerationRef.current;
    const name = userName.trim();
    if (!name) {
      setStatus("Enter a display name");
      return;
    }

    teardown();

    const authToken = await fetchWgwAuthToken({
      authToken: urls.authToken,
      authTokenUrl: urls.authTokenUrl,
      authUser: urls.authUser,
      authPassword: urls.authPassword,
    });
    if (generation !== joinGenerationRef.current) return;
    authTokenRef.current = authToken;
    let rtcSettings;
    try {
      rtcSettings = await fetchRtcSettings({
        url: urls.collabRtcUrl,
        bearerToken: authToken,
        channel: "collab",
      });
    } catch (error) {
      console.warn("[docs-collab] rtc settings unavailable", error);
      rtcSettings = resolveRtcSettings(DEFAULT_RTC_SETTINGS);
    }
    if (generation !== joinGenerationRef.current) return;

    setDocStatus("Loading document…");
    pendingMarkdownRef.current = await loadMarkdown(urls.documentUrl, authToken);
    if (generation !== joinGenerationRef.current) return;
    seedDoneRef.current = false;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const hadSnapshot =
      documentFormat === "text" ? false : await loadYjsSnapshot(urls.yjsUrl, ydoc, authToken);
    if (generation !== joinGenerationRef.current) return;
    if (hadSnapshot) seedDoneRef.current = true;

    const awareness = new awarenessProtocol.Awareness(ydoc);
    awarenessRef.current = awareness;
    const user = { name, color: colorForName(name) };
    awareness.setLocalStateField("user", user);

    ydoc.on("update", (update, origin) => {
      if (origin === MESH_ORIGIN || origin === SEED_ORIGIN) return;
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

    const mesh = new DocsRtcSession({
      apiBase: urls.collabApiBaseUrl ?? "/api/v1/collab",
      room: urls.room ?? "docs/test-together.md",
      authToken,
      rtcSettings: rtcSettings ?? resolveRtcSettings(DEFAULT_RTC_SETTINGS),
    });
    meshRef.current = mesh;
    mesh.onMessage(handleMeshMessage);

    const joinedData = await mesh.join(name);
    if (generation !== joinGenerationRef.current) return;
    setSession({ ydoc, awareness, user });
    setJoined(true);
    setConnectingPeers(joinedData.peers);
    refreshMeshUi();

    if (!seedDoneRef.current && isYDocEmpty(ydoc)) {
      if (mesh.getPeerIds().length === 0) {
        applyContentSeedToYDoc(ydoc, pendingMarkdownRef.current, documentFormat);
        markDocReady();
        setDocStatus("Loaded shared document");
      } else {
        const tick = () => trySeedFromFile();
        seedTimerRef.current = setTimeout(tick, 1000);
        setTimeout(tick, 3000);
      }
    } else {
      setDocStatus(hadSnapshot ? "Restored Yjs snapshot" : "");
    }
  }, [
    handleMeshMessage,
    markDocReady,
    refreshMeshUi,
    teardown,
    trySeedFromFile,
    documentFormat,
    urls.collabApiBaseUrl,
    urls.collabRtcUrl,
    urls.documentUrl,
    urls.authToken,
    urls.authPassword,
    urls.authTokenUrl,
    urls.authUser,
    urls.room,
    urls.signalUrl,
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
    const getMd = getMarkdownRef.current;
    const ydoc = ydocRef.current;
    if (!getMd || !ydoc) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await saveDocument(
      urls.documentUrl,
      getMd(),
      ydoc,
      urls.room,
      authTokenRef.current,
      urls.documentSaveMethod ?? "POST",
    );
    setDocStatus(`Saved · ${new Date().toLocaleTimeString()}`);
  }, [urls.documentSaveMethod, urls.documentUrl, urls.room]);

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
    join,
    leave,
    saveNow,
    onMarkdownChange,
  };
}

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { useCallback, useEffect, useRef, useState } from "react";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import { applyMarkdownSeedToYDoc } from "@/text-editor-core/laatste-test-collab/laatste-test-collab-editor-surface";
import {
  LaatsteTestMesh,
  type LaatsteTestMeshDebugStats,
  type LaatsteTestMeshMessage,
  type LaatsteTestMeshPeer,
} from "@/text-editor-core/laatste-test-collab/mesh";

const MESH_ORIGIN = "mesh";
const SEED_ORIGIN = "seed";
const SAVE_DELAY_MS = 2000;

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

const EMPTY_DEBUG: LaatsteTestMeshDebugStats = {
  joinCalls: 0,
  pollCalls: 0,
  pollMessages: 0,
  offersSent: 0,
  offersReceived: 0,
  answersSent: 0,
  answersReceived: 0,
  iceSent: 0,
  iceReceived: 0,
  connectAttempts: 0,
  initiatorAttempts: 0,
  responderAttempts: 0,
  dcOpen: 0,
  apiErrors: 0,
  rtcErrors: 0,
  lastRtcError: "",
};

export type LaatsteTestCollabUrls = {
  signalUrl: string;
  documentUrl: string;
  yjsUrl: string;
  room?: string;
};

export const DEFAULT_LAATSTE_TEST_COLLAB_URLS: LaatsteTestCollabUrls = {
  signalUrl: "/laatste-test/signal.php",
  documentUrl: "/laatste-test/document.php",
  yjsUrl: "/laatste-test/document.php?format=yjs",
  room: "docs/test-together.md",
};

type LaatsteTestYjsDebugStats = {
  localUpdates: number;
  syncSent: number;
  syncReceived: number;
  awarenessSent: number;
  awarenessReceived: number;
};

const EMPTY_YJS_DEBUG: LaatsteTestYjsDebugStats = {
  localUpdates: 0,
  syncSent: 0,
  syncReceived: 0,
  awarenessSent: 0,
  awarenessReceived: 0,
};

export type LaatsteTestCollabSession = {
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

async function loadMarkdown(documentUrl: string): Promise<string> {
  const res = await fetch(documentUrl);
  if (!res.ok) throw new Error(`Could not load document (${res.status})`);
  return res.text();
}

async function loadYjsSnapshot(yjsUrl: string, target: Y.Doc): Promise<boolean> {
  const res = await fetch(yjsUrl);
  if (res.status === 204 || !res.ok) return false;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length === 0) return false;
  Y.applyUpdate(target, buf, SEED_ORIGIN);
  return true;
}

async function saveDocument(documentUrl: string, markdown: string, ydoc: Y.Doc): Promise<void> {
  const res = await fetch(documentUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      markdown,
      yjs: Array.from(Y.encodeStateAsUpdate(ydoc)),
    }),
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

export type UseLaatsteTestCollabOptions = {
  userName: string;
  autoJoin?: boolean;
  urls?: LaatsteTestCollabUrls;
};

export function useLaatsteTestCollab({
  userName,
  autoJoin = true,
  urls = DEFAULT_LAATSTE_TEST_COLLAB_URLS,
}: UseLaatsteTestCollabOptions) {
  const meshRef = useRef<LaatsteTestMesh | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const pendingMarkdownRef = useRef("");
  const seedDoneRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getMarkdownRef = useRef<(() => string) | null>(null);
  const joinGenerationRef = useRef(0);

  const [session, setSession] = useState<LaatsteTestCollabSession | null>(null);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [docStatus, setDocStatus] = useState("");
  const [peers, setPeers] = useState<LaatsteTestMeshPeer[]>([]);
  const [linkCount, setLinkCount] = useState(0);
  const [debug, setDebug] = useState<LaatsteTestMeshDebugStats>(EMPTY_DEBUG);
  const [yjsDebug, setYjsDebug] = useState<LaatsteTestYjsDebugStats>(EMPTY_YJS_DEBUG);

  const refreshMeshUi = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    setLinkCount(mesh.linkCount());
    setPeers(mesh.getRoomPeers());
    setDebug(mesh.getDebugStats());
    setStatus(
      `Mesh · ${mesh.getMyName()} · ${mesh.getMyId()?.slice(0, 8) ?? "—"}… · ${mesh.getPeerIds().length} other peer(s) · ${mesh.linkCount()} link(s)`,
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
      void saveDocument(urls.documentUrl, getMd(), ydoc)
        .then(() => setDocStatus(`Saved · ${new Date().toLocaleTimeString()}`))
        .catch((err) =>
          setDocStatus(`Save failed: ${err instanceof Error ? err.message : String(err)}`),
        );
    }, SAVE_DELAY_MS);
  }, [urls.documentUrl]);

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

    applyMarkdownSeedToYDoc(ydoc, markdown);
    markDocReady();
    setDocStatus("Loaded shared document.md");
  }, [markDocReady]);

  const sendSyncStep1 = useCallback((toPeerId?: string) => {
    const ydoc = ydocRef.current;
    const mesh = meshRef.current;
    if (!ydoc || !mesh) return;
    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, ydoc);
    const msg = { type: "sync" as const, u: Array.from(encoding.toUint8Array(encoder)) };
    setYjsDebug((prev) => ({ ...prev, syncSent: prev.syncSent + 1 }));
    if (toPeerId) mesh.sendTo(toPeerId, msg);
    else mesh.broadcast(msg);
  }, []);

  const handleMeshMessage = useCallback(
    (msg: LaatsteTestMeshMessage) => {
      const ydoc = ydocRef.current;
      const awareness = awarenessRef.current;
      if (!ydoc || !awareness) return;

      if (msg.type === "sync" && Array.isArray(msg.u)) {
        setYjsDebug((prev) => ({ ...prev, syncReceived: prev.syncReceived + 1 }));
        const decoder = decoding.createDecoder(Uint8Array.from(msg.u));
        const encoder = encoding.createEncoder();
        syncProtocol.readSyncMessage(decoder, encoder, ydoc, MESH_ORIGIN);
        if (!isYDocEmpty(ydoc)) markDocReady();
        if (encoding.length(encoder) > 1) {
          const reply = { type: "sync" as const, u: Array.from(encoding.toUint8Array(encoder)) };
          setYjsDebug((prev) => ({ ...prev, syncSent: prev.syncSent + 1 }));
          if (msg.from) meshRef.current?.sendTo(msg.from, reply);
          else meshRef.current?.broadcast(reply);
        }
      }
      if (msg.type === "awareness" && Array.isArray(msg.u)) {
        setYjsDebug((prev) => ({ ...prev, awarenessReceived: prev.awarenessReceived + 1 }));
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
    seedDoneRef.current = false;
    setSession(null);
    setJoined(false);
    setPeers([]);
    setLinkCount(0);
    setDebug(EMPTY_DEBUG);
    setYjsDebug(EMPTY_YJS_DEBUG);
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

    setDocStatus("Loading document…");
    pendingMarkdownRef.current = await loadMarkdown(urls.documentUrl);
    if (generation !== joinGenerationRef.current) return;
    seedDoneRef.current = false;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const hadSnapshot = await loadYjsSnapshot(urls.yjsUrl, ydoc);
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
      setYjsDebug((prev) => ({
        ...prev,
        localUpdates: prev.localUpdates + 1,
        syncSent: prev.syncSent + 1,
      }));
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
        setYjsDebug((prev) => ({ ...prev, awarenessSent: prev.awarenessSent + 1 }));
        meshRef.current?.broadcast({ type: "awareness", u: Array.from(encoded) });
      },
    );

    const mesh = new LaatsteTestMesh(urls.signalUrl, urls.room ?? "docs/test-together.md");
    meshRef.current = mesh;
    mesh.onMessage(handleMeshMessage);

    const joinedData = await mesh.join(name);
    if (generation !== joinGenerationRef.current) return;
    setSession({ ydoc, awareness, user });
    setJoined(true);
    setPeers(joinedData.peers);
    refreshMeshUi();

    if (!seedDoneRef.current && isYDocEmpty(ydoc)) {
      if (mesh.getPeerIds().length === 0) {
        applyMarkdownSeedToYDoc(ydoc, pendingMarkdownRef.current);
        markDocReady();
        setDocStatus("Loaded shared document.md");
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
    urls.documentUrl,
    urls.signalUrl,
    urls.yjsUrl,
    userName,
  ]);

  const leave = useCallback(async () => {
    const getMd = getMarkdownRef.current;
    const ydoc = ydocRef.current;
    if (getMd && ydoc) {
      try {
        await saveDocument(urls.documentUrl, getMd(), ydoc);
      } catch {
        // ignore
      }
    }
    await teardown();
  }, [teardown, urls.documentUrl]);

  const saveNow = useCallback(async () => {
    const getMd = getMarkdownRef.current;
    const ydoc = ydocRef.current;
    if (!getMd || !ydoc) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await saveDocument(urls.documentUrl, getMd(), ydoc);
    setDocStatus(`Saved · ${new Date().toLocaleTimeString()}`);
  }, [urls.documentUrl]);

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
        console.warn("[laatste-test-collab] join failed", error);
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
    linkCount,
    debug,
    yjsDebug,
    join,
    leave,
    saveNow,
    onMarkdownChange,
  };
}

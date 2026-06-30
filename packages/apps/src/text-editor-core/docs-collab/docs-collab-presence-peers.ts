import type * as awarenessProtocol from "y-protocols/awareness";
import type { DocsCollabMeshPeer } from "./docs-collab-types";

type AwarenessUserState = {
  name?: unknown;
};

function readAwarenessUserName(state: Record<string, unknown> | null): string | null {
  if (!state) return null;
  const user = state.user as AwarenessUserState | undefined;
  if (!user || typeof user.name !== "string") return null;
  const name = user.name.trim();
  return name || null;
}

/** Remote collaborators from Yjs awareness (matches caret/presence identity). */
export function listAwarenessPresencePeers(
  awareness: awarenessProtocol.Awareness,
): DocsCollabMeshPeer[] {
  const localClientId = awareness.clientID;
  const peers: DocsCollabMeshPeer[] = [];

  awareness.getStates().forEach((state, clientId) => {
    if (clientId === localClientId) return;
    const name = readAwarenessUserName(state);
    if (!name) return;
    peers.push({ id: String(clientId), name });
  });

  return peers;
}

/** Prefer awareness names; add mesh peers not already represented (e.g. connecting). */
export function mergeCollabPresencePeers(
  awarenessPeers: DocsCollabMeshPeer[],
  meshPeers: DocsCollabMeshPeer[],
  localUserName: string,
): DocsCollabMeshPeer[] {
  const localKey = localUserName.trim().toLowerCase();
  const byName = new Map<string, DocsCollabMeshPeer>();

  for (const peer of awarenessPeers) {
    const key = peer.name.trim().toLowerCase();
    if (!key || key === localKey) continue;
    byName.set(key, peer);
  }

  for (const peer of meshPeers) {
    const key = peer.name.trim().toLowerCase();
    if (!key || key === localKey || byName.has(key)) continue;
    byName.set(key, peer);
  }

  return [...byName.values()];
}

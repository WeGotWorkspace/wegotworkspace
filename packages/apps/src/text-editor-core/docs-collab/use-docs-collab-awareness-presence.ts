import { useEffect, useState } from "react";
import type * as awarenessProtocol from "y-protocols/awareness";
import type { DocsCollabMeshPeer } from "./docs-collab-types";
import { listAwarenessPresencePeers } from "./docs-collab-presence-peers";

export function useDocsCollabAwarenessPresence(
  awareness: awarenessProtocol.Awareness | null | undefined,
): DocsCollabMeshPeer[] {
  const [peers, setPeers] = useState<DocsCollabMeshPeer[]>([]);

  useEffect(() => {
    if (!awareness) {
      setPeers([]);
      return;
    }

    const refresh = () => {
      setPeers(listAwarenessPresencePeers(awareness));
    };

    refresh();
    awareness.on("update", refresh);
    return () => {
      awareness.off("update", refresh);
    };
  }, [awareness]);

  return peers;
}

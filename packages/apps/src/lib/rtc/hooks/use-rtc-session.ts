import { useEffect, useMemo, useState } from "react";
import { HttpSignalingClient } from "@/lib/rtc/signaling/http-client";
import { RtcPeerMesh, type RtcPeerMeshOptions } from "@/lib/rtc/session/peer-mesh";
import type { RtcLinkState, RtcPeerDescriptor } from "@/lib/rtc/types";

export type UseRtcSessionOptions = Omit<RtcPeerMeshOptions, "signaling"> & {
  apiBase: string;
  enabled?: boolean;
  auth?: {
    bearerToken?: string;
    sessionKey?: string;
  };
};

export type UseRtcSessionResult = {
  mesh: RtcPeerMesh | null;
  peerId: string | null;
  peers: RtcPeerDescriptor[];
  linkStates: Array<RtcPeerDescriptor & { link: RtcLinkState }>;
  join: (input: { name: string; peerId?: string }) => Promise<void>;
  leave: () => Promise<void>;
};

export function useRtcSession(options: UseRtcSessionOptions): UseRtcSessionResult {
  const { apiBase, enabled = true, auth, ...meshOptions } = options;
  const mesh = useMemo(() => {
    if (!enabled) return null;
    const signaling = new HttpSignalingClient({
      channel: meshOptions.channel,
      apiBase,
      getAuth: () => auth ?? {},
    });
    return new RtcPeerMesh({
      ...meshOptions,
      signaling,
      onLinkChange: () => {
        meshOptions.onLinkChange?.();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mesh is scoped to channel/room/apiBase
  }, [enabled, apiBase, meshOptions.channel, meshOptions.room]);

  const [peerId, setPeerId] = useState<string | null>(null);
  const [peers, setPeers] = useState<RtcPeerDescriptor[]>([]);
  const [linkStates, setLinkStates] = useState<Array<RtcPeerDescriptor & { link: RtcLinkState }>>(
    [],
  );

  useEffect(() => {
    return () => {
      void mesh?.leave();
    };
  }, [mesh]);

  const refresh = () => {
    if (!mesh) return;
    setPeerId(mesh.getMyId());
    setPeers(mesh.getRoomPeers());
    setLinkStates(mesh.getPeerLinkStates());
  };

  return {
    mesh,
    peerId,
    peers,
    linkStates,
    join: async (input) => {
      if (!mesh) throw new Error("RTC session is not initialized");
      const joined = await mesh.join(input);
      setPeerId(joined.peerId);
      refresh();
    },
    leave: async () => {
      if (!mesh) return;
      await mesh.leave();
      setPeerId(null);
      setPeers([]);
      setLinkStates([]);
    },
  };
}

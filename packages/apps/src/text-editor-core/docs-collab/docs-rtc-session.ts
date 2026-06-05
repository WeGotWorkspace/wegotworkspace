import { createDataBinding } from "@/lib/rtc/session/bindings";
import { createRtcSession } from "@/lib/rtc/session/create-rtc-session";
import type { RtcPeerMesh } from "@/lib/rtc/session/peer-mesh";
import type { RtcSettings } from "@/lib/rtc/types";
import type {
  DocsCollabMeshMessage,
  DocsCollabMeshPeer,
  DocsCollabMeshPeerStatus,
} from "@/text-editor-core/docs-collab/docs-collab-types";

const DC_LABEL = "collab";

type MeshListener = (msg: DocsCollabMeshMessage) => void;

export type DocsRtcSessionOptions = {
  apiBase: string;
  room: string;
  authToken?: string;
  rtcSettings: RtcSettings;
};

export class DocsRtcSession {
  private myName = "";

  private readonly listeners = new Set<MeshListener>();

  private readonly mesh: RtcPeerMesh;

  constructor(private readonly options: DocsRtcSessionOptions) {
    const binding = createDataBinding({
      label: DC_LABEL,
      onOpen: (remoteId) => this.emit({ type: "dc-open", from: remoteId }),
      onMessage: (remoteId, data) => {
        try {
          const msg = JSON.parse(data) as DocsCollabMeshMessage;
          if (msg && typeof msg === "object") {
            this.emit({ ...msg, from: remoteId } as DocsCollabMeshMessage);
          }
        } catch {
          // ignore malformed payloads
        }
      },
      onClose: () => this.emit({ type: "link" }),
    });

    this.mesh = createRtcSession({
      channel: "collab",
      room: options.room,
      rtcSettings: options.rtcSettings,
      binding,
      iceCandidatePoolSize: 2,
      signaling: {
        apiBase: options.apiBase,
        getAuth: () => ({ bearerToken: options.authToken }),
      },
      onLinkChange: () => this.emit({ type: "link" }),
    });
  }

  private emit(msg: DocsCollabMeshMessage): void {
    for (const listener of this.listeners) listener(msg);
  }

  onMessage(listener: MeshListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getMyId(): string | null {
    return this.mesh.getMyId();
  }

  getMyName(): string {
    return this.myName;
  }

  getPeerIds(): string[] {
    return this.mesh.getPeerIds();
  }

  getRoomPeers(): DocsCollabMeshPeer[] {
    return this.mesh.getRoomPeers();
  }

  getRoomPeerStatuses(): DocsCollabMeshPeerStatus[] {
    return this.mesh.getPeerLinkStates().map((peer) => ({
      id: peer.id,
      name: peer.name,
      link: peer.link as DocsCollabMeshPeerStatus["link"],
    }));
  }

  linkCount(): number {
    return this.mesh.linkCount();
  }

  broadcast(msg: DocsCollabMeshMessage): void {
    this.mesh.broadcastJson(msg);
  }

  sendTo(remoteId: string, msg: DocsCollabMeshMessage): void {
    this.mesh.sendJsonTo(remoteId, msg);
  }

  async join(name: string): Promise<{ peerId: string; peers: DocsCollabMeshPeer[] }> {
    this.myName = name.trim();
    const joined = await this.mesh.join({ name: this.myName });
    return { peerId: joined.peerId, peers: joined.peers };
  }

  async leave(): Promise<void> {
    await this.mesh.leave();
    this.myName = "";
  }
}

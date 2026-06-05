export type DocsCollabMeshPeer = { id: string; name: string };

export type DocsCollabPeerLinkState =
  | "connected"
  | "connecting"
  | "failed"
  | "disconnected"
  | "closed";

export type DocsCollabMeshPeerStatus = DocsCollabMeshPeer & { link: DocsCollabPeerLinkState };

export type DocsCollabMeshMessage =
  | { type: "sync"; u: number[]; from?: string }
  | { type: "awareness"; u: number[]; from?: string }
  | { type: "dc-open"; from: string }
  | { type: "link" };

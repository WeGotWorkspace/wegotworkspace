import type { DocsCollabMeshMessage, DocsCollabMeshPeer } from "./docs-collab-types";

export const BC_TAB_ORIGIN = "bc-tab";
export const TAB_PING_INTERVAL_MS = 2000;
export const LEADER_STALE_MS = 6000;

export type TabPresence = {
  tabId: string;
  visible: boolean;
  lastSeen: number;
};

export type TabMeshStateSnapshot = {
  peers: DocsCollabMeshPeer[];
  connectingPeers: DocsCollabMeshPeer[];
  warningPeers: DocsCollabMeshPeer[];
  linkCount: number;
  status: string;
};

export type TabSyncMessage =
  | { type: "sync"; u: number[]; fromTab: string }
  | { type: "awareness"; u: number[]; fromTab: string }
  | { type: "tab-ping"; tabId: string; visible: boolean; at: number }
  | { type: "tab-leave"; tabId: string; at: number }
  | { type: "leader-resign"; tabId: string; at: number }
  | ({ type: "mesh-state"; fromTab: string } & TabMeshStateSnapshot);

export type TabSyncHandlers = {
  onSyncFromTab: (updateBytes: number[]) => void;
  onAwarenessFromTab: (updateBytes: number[]) => void;
  onMeshStateFromLeader: (state: TabMeshStateSnapshot) => void;
  onBecomeLeader: () => void;
  onResignLeader: () => void;
};

export function tabSyncChannelName(room: string): string {
  return `wgw.docs-collab.tab:${room}`;
}

export function createTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function isTabPresenceStale(lastSeen: number, now: number = Date.now()): boolean {
  return now - lastSeen > LEADER_STALE_MS;
}

export function pruneStaleTabs(
  tabs: Map<string, TabPresence>,
  now: number = Date.now(),
): Map<string, TabPresence> {
  const active = new Map<string, TabPresence>();
  for (const [tabId, tab] of tabs) {
    if (!isTabPresenceStale(tab.lastSeen, now)) active.set(tabId, tab);
  }
  return active;
}

/** Prefer visible tabs; break ties with lexicographically smallest tab id. */
export function electLeaderTabId(
  tabs: ReadonlyMap<string, TabPresence>,
  now: number = Date.now(),
): string | null {
  const active = pruneStaleTabs(new Map(tabs), now);
  if (active.size === 0) return null;

  const visible = [...active.values()].filter((tab) => tab.visible);
  const candidates = visible.length > 0 ? visible : [...active.values()];
  candidates.sort((a, b) => a.tabId.localeCompare(b.tabId));
  return candidates[0]?.tabId ?? null;
}

export function isTabSyncMessage(value: unknown): value is TabSyncMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Partial<TabSyncMessage>;
  if (msg.type === "sync" || msg.type === "awareness") {
    return typeof msg.fromTab === "string" && Array.isArray(msg.u);
  }
  if (msg.type === "tab-ping" || msg.type === "tab-leave" || msg.type === "leader-resign") {
    return typeof msg.tabId === "string";
  }
  if (msg.type === "mesh-state") {
    return typeof msg.fromTab === "string" && Array.isArray(msg.peers);
  }
  return false;
}

export function routeTabSyncMessage(
  msg: TabSyncMessage,
  myTabId: string,
  handlers: Pick<TabSyncHandlers, "onSyncFromTab" | "onAwarenessFromTab" | "onMeshStateFromLeader">,
): void {
  if (msg.type === "tab-ping" || msg.type === "tab-leave" || msg.type === "leader-resign") {
    return;
  }
  if (msg.fromTab === myTabId) return;

  if (msg.type === "sync") {
    handlers.onSyncFromTab(msg.u);
    return;
  }
  if (msg.type === "awareness") {
    handlers.onAwarenessFromTab(msg.u);
  }
  if (msg.type === "mesh-state") {
    handlers.onMeshStateFromLeader({
      peers: msg.peers,
      connectingPeers: msg.connectingPeers,
      warningPeers: msg.warningPeers,
      linkCount: msg.linkCount,
      status: msg.status,
    });
  }
}

export function applyTabPresenceMessage(
  tabs: Map<string, TabPresence>,
  msg: TabSyncMessage,
  now: number = Date.now(),
): void {
  if (msg.type === "tab-ping") {
    tabs.set(msg.tabId, { tabId: msg.tabId, visible: msg.visible, lastSeen: msg.at || now });
    return;
  }
  if (msg.type === "tab-leave" || msg.type === "leader-resign") {
    tabs.delete(msg.tabId);
  }
}

export function shouldResignOnHide(isLeader: boolean, visible: boolean): boolean {
  return isLeader && !visible;
}

export type MeshRelayMessage = Extract<DocsCollabMeshMessage, { type: "sync" | "awareness" }>;

export function meshMessageForTabRelay(msg: DocsCollabMeshMessage): MeshRelayMessage | null {
  if (msg.type !== "sync" && msg.type !== "awareness") return null;
  if (!Array.isArray(msg.u)) return null;
  return msg;
}

export class DocsCollabTabCoordinator {
  private readonly tabs = new Map<string, TabPresence>();

  private channel: BroadcastChannel | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private electTimer: ReturnType<typeof setInterval> | null = null;

  private isLeader = false;

  private visible = typeof document === "undefined" ? true : document.visibilityState === "visible";

  private readonly onVisibilityChange: () => void;

  private readonly onPageHide: () => void;

  constructor(
    private readonly room: string,
    private readonly handlers: TabSyncHandlers,
    readonly tabId: string = createTabId(),
  ) {
    this.onVisibilityChange = () => {
      this.visible = document.visibilityState === "visible";
      this.sendPing();
      if (shouldResignOnHide(this.isLeader, this.visible)) {
        this.resignLeadership();
      }
      this.runElection();
    };
    this.onPageHide = () => {
      this.resignLeadership();
      this.post({ type: "tab-leave", tabId: this.tabId, at: Date.now() });
    };
  }

  get meshLeader(): boolean {
    return this.isLeader;
  }

  start(): void {
    const now = Date.now();
    this.tabs.set(this.tabId, { tabId: this.tabId, visible: this.visible, lastSeen: now });

    try {
      this.channel = new BroadcastChannel(tabSyncChannelName(this.room));
      this.channel.onmessage = (event) => this.handleMessage(event.data);
    } catch {
      this.channel = null;
    }

    this.sendPing();
    this.runElection();

    this.pingTimer = setInterval(() => this.sendPing(), TAB_PING_INTERVAL_MS);
    this.electTimer = setInterval(() => this.runElection(), TAB_PING_INTERVAL_MS);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
      window.addEventListener("pagehide", this.onPageHide);
    }
  }

  stop(): void {
    if (this.isLeader) {
      this.isLeader = false;
      this.post({ type: "leader-resign", tabId: this.tabId, at: Date.now() });
    }
    this.post({ type: "tab-leave", tabId: this.tabId, at: Date.now() });

    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.electTimer) clearInterval(this.electTimer);
    this.pingTimer = null;
    this.electTimer = null;

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      window.removeEventListener("pagehide", this.onPageHide);
    }

    this.channel?.close();
    this.channel = null;
    this.tabs.clear();
  }

  publishSync(encoded: number[]): void {
    this.post({ type: "sync", u: encoded, fromTab: this.tabId });
  }

  publishAwareness(encoded: number[]): void {
    this.post({ type: "awareness", u: encoded, fromTab: this.tabId });
  }

  publishMeshState(state: TabMeshStateSnapshot): void {
    if (!this.isLeader) return;
    this.post({ type: "mesh-state", fromTab: this.tabId, ...state });
  }

  relayMeshMessage(msg: DocsCollabMeshMessage): void {
    const relay = meshMessageForTabRelay(msg);
    if (!relay || !this.isLeader) return;
    if (relay.type === "sync") this.publishSync(relay.u);
    else this.publishAwareness(relay.u);
  }

  private handleMessage(data: unknown): void {
    if (!isTabSyncMessage(data)) return;

    if (data.type === "tab-ping") {
      const wasKnown = this.tabs.has(data.tabId);
      applyTabPresenceMessage(this.tabs, data);
      if (!wasKnown && data.tabId !== this.tabId) this.sendPing();
      this.runElection();
      return;
    }

    applyTabPresenceMessage(this.tabs, data);
    routeTabSyncMessage(data, this.tabId, this.handlers);

    if (data.type === "leader-resign" || data.type === "tab-leave") {
      this.runElection();
    }
  }

  private sendPing(): void {
    this.tabs.set(this.tabId, {
      tabId: this.tabId,
      visible: this.visible,
      lastSeen: Date.now(),
    });
    this.post({
      type: "tab-ping",
      tabId: this.tabId,
      visible: this.visible,
      at: Date.now(),
    });
  }

  private runElection(): void {
    const leaderId = electLeaderTabId(this.tabs);
    const shouldLead = leaderId === this.tabId;

    if (shouldLead && !this.isLeader) {
      this.isLeader = true;
      this.handlers.onBecomeLeader();
      return;
    }

    if (!shouldLead && this.isLeader) {
      this.resignLeadership();
    }
  }

  private resignLeadership(): void {
    if (!this.isLeader) return;
    this.isLeader = false;
    this.post({ type: "leader-resign", tabId: this.tabId, at: Date.now() });
    this.handlers.onResignLeader();
  }

  private post(message: TabSyncMessage): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      // Ignore BC post failures — mesh path remains available on leader tabs.
    }
  }
}

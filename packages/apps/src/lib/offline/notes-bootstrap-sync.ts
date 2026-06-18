const CHANNEL_NAME = "wgw.notes.bootstrap";
const STORAGE_KEY = "wgw.notes.bootstrap.sync";

export type NotesBootstrapSyncMessage = {
  type: "notes-bootstrap-updated";
  username: string;
  at: number;
};

function isNotesBootstrapSyncMessage(value: unknown): value is NotesBootstrapSyncMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Partial<NotesBootstrapSyncMessage>;
  return msg.type === "notes-bootstrap-updated" && typeof msg.username === "string";
}

/** Tell other tabs that notes bootstrap changed (flush, refresh, conflict resolve). */
export function notifyNotesBootstrapUpdated(username: string): void {
  if (typeof window === "undefined" || !username) return;

  const message: NotesBootstrapSyncMessage = {
    type: "notes-bootstrap-updated",
    username,
    at: Date.now(),
  };

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(message);
    channel.close();
  } catch {
    // BroadcastChannel unavailable — storage event fallback below.
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...message, nonce: Math.random() }));
  } catch {
    // Private mode / quota — same-tab refresh still runs via caller.
  }
}

/** Subscribe to bootstrap updates from other tabs for the same offline account. */
export function subscribeNotesBootstrapUpdated(username: string, onUpdate: () => void): () => void {
  if (typeof window === "undefined" || !username) return () => undefined;

  const handle = (value: unknown) => {
    if (!isNotesBootstrapSyncMessage(value)) return;
    if (value.username !== username) return;
    onUpdate();
  };

  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => handle(event.data);
  } catch {
    // Ignore — storage fallback may still work cross-tab.
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      handle(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed payloads.
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}

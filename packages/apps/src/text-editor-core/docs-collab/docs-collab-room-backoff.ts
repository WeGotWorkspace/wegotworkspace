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

export function roomServerAllowed(room: string, now = Date.now()): boolean {
  const backoff = roomServerBackoff.get(room);
  return !backoff || now >= backoff.nextAttemptAt;
}

export function markRoomServerSuccess(room: string): void {
  roomServerBackoff.delete(room);
}

export function markRoomServerFailure(room: string, now = Date.now()): void {
  const prev = roomServerBackoff.get(room);
  const retryMs = prev
    ? Math.min(prev.retryMs * 2, ROOM_SERVER_BACKOFF_MAX_MS)
    : ROOM_SERVER_BACKOFF_INITIAL_MS;
  roomServerBackoff.set(room, { retryMs, nextAttemptAt: now + retryMs });
}

export { ROOM_SERVER_BACKOFF_INITIAL_MS, ROOM_SERVER_BACKOFF_MAX_MS };

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  markRoomServerFailure,
  markRoomServerSuccess,
  resetDocsCollabBackoffForTests,
  roomServerAllowed,
  ROOM_SERVER_BACKOFF_INITIAL_MS,
} from "./docs-collab-room-backoff";

describe("docs-collab-room-backoff", () => {
  afterEach(() => {
    resetDocsCollabBackoffForTests();
    vi.useRealTimers();
  });

  it("allows server requests when no backoff is recorded", () => {
    expect(roomServerAllowed("docs/test.md")).toBe(true);
  });

  it("blocks server requests until nextAttemptAt", () => {
    const now = 1_000_000;
    markRoomServerFailure("docs/test.md", now);
    expect(roomServerAllowed("docs/test.md", now)).toBe(false);
    expect(roomServerAllowed("docs/test.md", now + ROOM_SERVER_BACKOFF_INITIAL_MS)).toBe(true);
  });

  it("doubles retry delay on repeated failures", () => {
    const now = 1_000_000;
    markRoomServerFailure("docs/test.md", now);
    expect(roomServerAllowed("docs/test.md", now + ROOM_SERVER_BACKOFF_INITIAL_MS - 1)).toBe(false);
    expect(roomServerAllowed("docs/test.md", now + ROOM_SERVER_BACKOFF_INITIAL_MS)).toBe(true);

    markRoomServerFailure("docs/test.md", now + ROOM_SERVER_BACKOFF_INITIAL_MS);
    expect(roomServerAllowed("docs/test.md", now + ROOM_SERVER_BACKOFF_INITIAL_MS * 3 - 1)).toBe(
      false,
    );
    expect(roomServerAllowed("docs/test.md", now + ROOM_SERVER_BACKOFF_INITIAL_MS * 3)).toBe(true);
  });

  it("clears backoff on success", () => {
    markRoomServerFailure("docs/test.md");
    markRoomServerSuccess("docs/test.md");
    expect(roomServerAllowed("docs/test.md")).toBe(true);
  });

  it("resetDocsCollabBackoffForTests clears all rooms", () => {
    markRoomServerFailure("room-a");
    markRoomServerFailure("room-b");
    resetDocsCollabBackoffForTests();
    expect(roomServerAllowed("room-a")).toBe(true);
    expect(roomServerAllowed("room-b")).toBe(true);
  });
});

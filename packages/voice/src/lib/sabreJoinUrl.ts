/**
 * Guest join URLs look like {@code …/voice/join/ROOMCODE} (room matches Sabre signaling rules).
 * Legacy pasted URLs may still use {@code /talk/join/…}; see {@link parseJoinInputToRoomCode}.
 */

const ROOM_IN_PATH = /^[A-Za-z0-9_-]{4,64}$/;

/** Old path before “Talk” was renamed to Voice in the router. */
const LEGACY_GUEST_JOIN_PREFIX = "/talk/join/";

function normalizedGuestJoinPrefix(): string {
  if (typeof window === "undefined") {
    return "/voice/join/";
  }
  const raw = window.__SABRE_VOICE_CONFIG__?.guestJoinPath?.trim();
  const prefix = raw && raw.length > 0 ? raw : "/voice/join/";
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function roomCodeFromJoinPathname(pathname: string, joinPrefix: string): string | null {
  if (!pathname.startsWith(joinPrefix)) {
    return null;
  }
  const rest = pathname.slice(joinPrefix.length);
  const segment = rest.split("/").filter(Boolean)[0];
  if (!segment) {
    return null;
  }
  let code: string;
  try {
    code = decodeURIComponent(segment);
  } catch {
    return null;
  }
  const upper = code.toUpperCase();
  if (!ROOM_IN_PATH.test(upper)) {
    return null;
  }
  return upper;
}

/**
 * Reads a room code from {@code window.location.pathname} when it starts with the injected {@code guestJoinPath}.
 */
export function parseRoomCodeFromGuestPath(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const path = window.location.pathname;
  const prefix = window.__SABRE_VOICE_CONFIG__?.guestJoinPath;
  if (prefix && typeof prefix === "string") {
    const norm = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return roomCodeFromJoinPathname(path, norm);
  }
  const norm = normalizedGuestJoinPrefix();
  const fromVoice = roomCodeFromJoinPathname(path, norm);
  if (fromVoice !== null) {
    return fromVoice;
  }
  return roomCodeFromJoinPathname(path, LEGACY_GUEST_JOIN_PREFIX);
}

/**
 * Full absolute URL for sharing (guests open without site login).
 */
export function buildGuestJoinPath(roomCode: string): string {
  const norm = normalizedGuestJoinPrefix();
  const path = `${norm}${encodeURIComponent(roomCode)}`;
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Full absolute URL for sharing (guests open without site login).
 */
export function buildGuestJoinUrl(roomCode: string): string {
  return `${window.location.origin}${buildGuestJoinPath(roomCode)}`;
}

/**
 * Accepts a bare room code or a full/path guest join URL; returns uppercase code for the join field.
 */
export function parseJoinInputToRoomCode(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }
  if (typeof window === "undefined") {
    return t.replace(/\s+/g, "").toUpperCase();
  }

  let pathname = "";
  try {
    if (t.includes("://")) {
      pathname = new URL(t).pathname;
    } else if (t.startsWith("/")) {
      pathname = new URL(t, window.location.origin).pathname;
    }
  } catch {
    pathname = "";
  }

  if (pathname) {
    const norm = normalizedGuestJoinPrefix();
    const fromVoice = roomCodeFromJoinPathname(pathname, norm);
    if (fromVoice !== null) {
      return fromVoice;
    }
    const fromLegacy = roomCodeFromJoinPathname(pathname, LEGACY_GUEST_JOIN_PREFIX);
    if (fromLegacy !== null) {
      return fromLegacy;
    }
  }

  return t.replace(/\s+/g, "").toUpperCase();
}

import type { AuraSettings } from "./settings";

/**
 * Temporary dev override: when true, {@link buildIceServers} ignores Admin / localStorage TURN
 * and uses the hardcoded test profile below. Keep this disabled for normal usage.
 */
export const HARDCODED_DEV_TURN_ENABLED = false;

/** Optional local test profile (disabled by default). Do not commit real credentials. */
const HARDCODED_DEV_TURN_ICE: RTCIceServer = {
  urls: ["turn:turn.example.com:3478?transport=tcp"],
  username: "",
  credential: "",
};

// Free European public STUN servers — no signup, no auth.
export const EU_STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.nextcloud.com:443" },
  { urls: "stun:stun.sipgate.net:3478" },
  { urls: "stun:stun.1und1.de:3478" },
  { urls: "stun:stun.t-online.de:3478" },
];

/**
 * Plain {@code turn:} (UDP) often fails on networks that block UDP; the same host usually
 * accepts {@code transport=tcp} on the same port. One {@link RTCIceServer} keeps a single user/pass pair.
 * Skips {@code turns:} (TLS) and {@code stun:}. Skips {@code :80} / {@code :443} (already TCP‑friendly paths).
 */
function turnIceUrls(url: string): string | string[] {
  const u = url.trim();
  const lower = u.toLowerCase();
  if (lower.startsWith("turns:") || lower.startsWith("stun:") || lower.startsWith("stuns:")) {
    return u;
  }
  if (!lower.startsWith("turn:")) {
    return u;
  }
  if (/\btransport\s*=\s*tcp\b/i.test(u)) {
    return u;
  }
  if (/^turn:[^:]+:80(\?|$)/i.test(u) || /^turn:[^:]+:443(\?|$)/i.test(u)) {
    return u;
  }
  const tcp = u.includes("?") ? `${u}&transport=tcp` : `${u}?transport=tcp`;
  return [u, tcp];
}

/** Supports comma/newline separated TURN/STUN URLs (handy for providers that return many endpoints). */
function parseTurnUrlList(raw: string): string[] {
  return raw
    .split(/[\n,\r]+/)
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

export function buildIceServers(s: AuraSettings): RTCIceServer[] {
  if (HARDCODED_DEV_TURN_ENABLED) {
    return [HARDCODED_DEV_TURN_ICE];
  }

  const turn = { turnUrl: s.turnUrl, turnUsername: s.turnUsername, turnCredential: s.turnCredential };
  const extraUrls = parseTurnUrlList(turn.turnUrl);
  const hasExtra = extraUrls.length > 0;
  // Firefox: "five or more STUN/TURN servers slows down discovery" — 4 default STUN + 1 admin hits 5.
  const stun = hasExtra ? EU_STUN_SERVERS.slice(0, 3) : EU_STUN_SERVERS;
  const list: RTCIceServer[] = [...stun];
  if (hasExtra) {
    const username = turn.turnUsername.trim() || undefined;
    const credential = turn.turnCredential.trim() || undefined;
    const urls: string[] = [];
    for (const url of extraUrls) {
      const v = turnIceUrls(url);
      if (Array.isArray(v)) urls.push(...v);
      else urls.push(v);
    }
    const deduped = [...new Set(urls)];
    const entry: RTCIceServer = {
      urls: deduped,
      username,
      credential,
    };
    list.push(entry);
  }
  return list;
}

export function buildRtcConfig(s: AuraSettings): RTCConfiguration {
  return {
    iceServers: buildIceServers(s),
    iceTransportPolicy: HARDCODED_DEV_TURN_ENABLED ? "relay" : "all",
    // Pooling creates extra TURN allocations; keep this 0 while debugging 508 allocate errors.
    iceCandidatePoolSize: HARDCODED_DEV_TURN_ENABLED ? 0 : 4,
  };
}

export function randomId(len = 10): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += a[buf[i] % a.length];
  return out;
}

export function randomRoom(): string {
  const r = randomId(12);
  return `${r.slice(0, 4)}-${r.slice(4, 8)}-${r.slice(8, 12)}`;
}

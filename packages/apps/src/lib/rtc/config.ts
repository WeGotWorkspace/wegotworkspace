import type { IceMode, RtcSettings } from "@/lib/rtc/types";

export type ToRtcConfigOptions = {
  /** Pool size when not forcing relay (meet: 4, collab: 2). */
  iceCandidatePoolSize?: number;
};

export function normalizeIceUrl(raw: string, defaultScheme: "stun" | "turn"): string {
  const value = raw.trim();
  if (value === "") return "";
  if (/^(stun|stuns|turn|turns):/i.test(value)) return value;
  return `${defaultScheme}:${value}`;
}

export function parseUrlList(raw: string, defaultScheme: "stun" | "turn"): string[] {
  return raw
    .split(/[\n,\r]+/)
    .map((value) => normalizeIceUrl(value, defaultScheme))
    .filter((value) => value !== "");
}

export function turnUrlCount(settings: RtcSettings): number {
  return parseUrlList(settings.turnUrls, "turn").length;
}

export function stunUrlCount(settings: RtcSettings): number {
  return parseUrlList(settings.stunUrls, "stun").length;
}

export function toRtcConfig(
  settings: RtcSettings,
  mode: IceMode,
  options: ToRtcConfigOptions = {},
): RTCConfiguration {
  const turnUrls = parseUrlList(settings.turnUrls, "turn");
  const forceRelay = (settings.forceRelay || mode === "relay") && turnUrls.length > 0;
  const stunUrls = parseUrlList(settings.stunUrls, "stun");
  const iceServers: RTCIceServer[] = [];

  if (forceRelay) {
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: turnUrls,
        username: settings.turnUsername || undefined,
        credential: settings.turnPassword || undefined,
      });
    }
  } else {
    if (stunUrls.length > 0) {
      iceServers.push({ urls: [...new Set(stunUrls)] });
    }
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: [...new Set(turnUrls)],
        username: settings.turnUsername || undefined,
        credential: settings.turnPassword || undefined,
      });
    }
  }

  const poolSize = options.iceCandidatePoolSize ?? 4;

  return {
    iceServers,
    iceTransportPolicy: forceRelay ? "relay" : "all",
    iceCandidatePoolSize: forceRelay ? 0 : poolSize,
  };
}

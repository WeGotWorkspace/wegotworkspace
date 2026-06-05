import { wgwApiBaseUrl, wgwReadJson } from "@/lib/api/wgw/http";
import { isRtcDebugEnabled } from "@/lib/rtc/debug";
import { rtcLog } from "@/lib/rtc/log";
import { DEFAULT_RTC_SETTINGS, type RtcSettings } from "@/lib/rtc/types";

export type { RtcSettings };

export function parseRtcSettingsPayload(payload: Record<string, unknown>): RtcSettings {
  const voice = (payload.voice ?? payload) as Record<string, unknown>;
  return {
    stunUrls: typeof voice.stunUrls === "string" ? voice.stunUrls : "",
    turnUrls: typeof voice.turnUrls === "string" ? voice.turnUrls : "",
    turnUsername: typeof voice.turnUsername === "string" ? voice.turnUsername : "",
    turnPassword: typeof voice.turnPassword === "string" ? voice.turnPassword : "",
    forceRelay: Boolean(voice.forceRelay),
  };
}

export async function fetchRtcSettings(options?: {
  url?: string;
  bearerToken?: string;
  channel?: "voice" | "collab";
}): Promise<RtcSettings> {
  const channel = options?.channel ?? "voice";
  const base = wgwApiBaseUrl();
  const requestUrl = options?.url ?? `${base}/${channel === "collab" ? "collab" : "voice"}/rtc`;
  rtcLog({ channel }, "rtc-settings-request", { requestUrl });
  const headers: Record<string, string> = {};
  if (options?.bearerToken) headers.Authorization = `Bearer ${options.bearerToken}`;

  const res = await fetch(requestUrl, { cache: "no-store", headers });
  if (!res.ok) {
    rtcLog({ channel }, "rtc-settings-response", { requestUrl, ok: false, status: res.status });
    return DEFAULT_RTC_SETTINGS;
  }
  try {
    const payload = (await wgwReadJson(res)) as Record<string, unknown>;
    const settings = parseRtcSettingsPayload(payload);
    rtcLog({ channel }, "rtc-settings-response", {
      requestUrl,
      ok: true,
      status: res.status,
      forceRelay: settings.forceRelay,
      turnUsernameConfigured: settings.turnUsername !== "",
      turnPasswordConfigured: settings.turnPassword !== "",
    });
    return settings;
  } catch {
    rtcLog({ channel }, "rtc-settings-response", {
      requestUrl,
      ok: true,
      status: res.status,
      parseError: true,
    });
    return DEFAULT_RTC_SETTINGS;
  }
}

export function isRtcDebugEnabledForChannel(): boolean {
  return isRtcDebugEnabled();
}

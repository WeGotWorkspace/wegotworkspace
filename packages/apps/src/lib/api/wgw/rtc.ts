import { wgwApiBaseUrl, wgwReadJson } from "@/lib/api/wgw/http";
import { isRtcDebugEnabled } from "@/lib/rtc/debug";
import { rtcLog } from "@/lib/rtc/log";
import { applyRtcDebugOverrides } from "@/lib/rtc/force-relay";
import { DEFAULT_RTC_SETTINGS, signalingApiSegment, type RtcSettings } from "@/lib/rtc/types";

export type { RtcSettings };

export type RtcIceSettings = Omit<RtcSettings, "forceRelay">;

export function parseRtcSettingsPayload(payload: Record<string, unknown>): RtcIceSettings {
  // OpenAPI/admin payload key for Meet ICE settings.
  const meet = (payload.meet ?? payload) as Record<string, unknown>;
  return {
    stunUrls: typeof meet.stunUrls === "string" ? meet.stunUrls : "",
    turnUrls: typeof meet.turnUrls === "string" ? meet.turnUrls : "",
    turnUsername: typeof meet.turnUsername === "string" ? meet.turnUsername : "",
    turnPassword: typeof meet.turnPassword === "string" ? meet.turnPassword : "",
  };
}

export function resolveRtcSettings(ice: RtcIceSettings): RtcSettings {
  return applyRtcDebugOverrides({ ...DEFAULT_RTC_SETTINGS, ...ice, forceRelay: false });
}

export async function fetchRtcSettings(options?: {
  url?: string;
  bearerToken?: string;
  channel?: "meet" | "collab";
}): Promise<RtcSettings> {
  const channel = options?.channel ?? "meet";
  const base = wgwApiBaseUrl();
  const requestUrl = options?.url ?? `${base}/${signalingApiSegment(channel)}/rtc`;
  rtcLog({ channel }, "rtc-settings-request", { requestUrl });
  const headers: Record<string, string> = {};
  if (options?.bearerToken) headers.Authorization = `Bearer ${options.bearerToken}`;

  const res = await fetch(requestUrl, { cache: "no-store", headers });
  if (!res.ok) {
    rtcLog({ channel }, "rtc-settings-response", { requestUrl, ok: false, status: res.status });
    return resolveRtcSettings(DEFAULT_RTC_SETTINGS);
  }
  try {
    const payload = (await wgwReadJson(res)) as Record<string, unknown>;
    const settings = resolveRtcSettings(parseRtcSettingsPayload(payload));
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
    return resolveRtcSettings(DEFAULT_RTC_SETTINGS);
  }
}

export function isRtcDebugEnabledForChannel(): boolean {
  return isRtcDebugEnabled();
}

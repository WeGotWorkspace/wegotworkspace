import type { RtcSettings } from "@/lib/rtc/types";

const RTC_FORCE_RELAY_QUERY_PARAM = "rtcForceRelay";

function matchesTruthy(value: string | null | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

/** Debug-only: `?rtcForceRelay=1` on the page URL. */
export function isRtcForceRelayEnabledFromQuery(search: string): boolean {
  return matchesTruthy(new URLSearchParams(search).get(RTC_FORCE_RELAY_QUERY_PARAM));
}

/** Debug-only: `VITE_WGW_RTC_FORCE_RELAY=1` in `.env.local` (Storybook / Vite dev). */
export function isRtcForceRelayEnabledFromEnv(): boolean {
  const raw = import.meta.env.VITE_WGW_RTC_FORCE_RELAY;
  if (typeof raw !== "string") return false;
  return matchesTruthy(raw);
}

export function isRtcForceRelayEnabled(): boolean {
  if (typeof window !== "undefined") {
    try {
      if (isRtcForceRelayEnabledFromQuery(window.location.search)) return true;
    } catch {
      // Ignore invalid location in non-browser test environments.
    }
  }
  return isRtcForceRelayEnabledFromEnv();
}

/** Apply dev/debug overrides after loading ICE settings from the API. */
export function applyRtcDebugOverrides(settings: RtcSettings): RtcSettings {
  return {
    ...settings,
    forceRelay: isRtcForceRelayEnabled(),
  };
}

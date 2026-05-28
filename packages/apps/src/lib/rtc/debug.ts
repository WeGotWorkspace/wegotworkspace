const RTC_DEBUG_QUERY_PARAM = "rtcDebug";
const LEGACY_RTC_DEBUG_QUERY_PARAMS = ["meetRtcDebug", "collabRtcDebug"] as const;

export function isRtcDebugEnabledFromQuery(search: string): boolean {
  const params = new URLSearchParams(search);

  const matchesTruthy = (value: string | null): boolean =>
    value === "1" || value?.toLowerCase() === "true";

  if (matchesTruthy(params.get(RTC_DEBUG_QUERY_PARAM))) {
    return true;
  }

  return LEGACY_RTC_DEBUG_QUERY_PARAMS.some((key) => matchesTruthy(params.get(key)));
}

export function isRtcDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return isRtcDebugEnabledFromQuery(window.location.search);
  } catch {
    return false;
  }
}

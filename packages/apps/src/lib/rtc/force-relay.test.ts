import { describe, expect, it } from "vitest";
import { applyRtcDebugOverrides, isRtcForceRelayEnabledFromQuery } from "@/lib/rtc/force-relay";
import { DEFAULT_RTC_SETTINGS } from "@/lib/rtc/types";

describe("isRtcForceRelayEnabledFromQuery", () => {
  it("matches rtcForceRelay=1", () => {
    expect(isRtcForceRelayEnabledFromQuery("?rtcForceRelay=1")).toBe(true);
    expect(isRtcForceRelayEnabledFromQuery("?rtcForceRelay=true")).toBe(true);
    expect(isRtcForceRelayEnabledFromQuery("?rtcDebug=1")).toBe(false);
  });
});

describe("applyRtcDebugOverrides", () => {
  it("defaults forceRelay to false without debug flags", () => {
    expect(
      applyRtcDebugOverrides({
        ...DEFAULT_RTC_SETTINGS,
        forceRelay: false,
      }).forceRelay,
    ).toBe(false);
  });
});

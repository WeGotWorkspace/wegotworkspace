import { applyRtcDebugOverrides } from "@/lib/rtc/force-relay";
import { DEFAULT_RTC_SETTINGS, type RtcSettings } from "@/lib/rtc/types";

export type DocsCollabAuthTokenInput = {
  authToken?: string;
  authTokenUrl?: string;
  authUser?: string;
  authPassword?: string;
};

export type DocsCollabWireOperations = {
  fetchAuthToken: (input: DocsCollabAuthTokenInput) => Promise<string | undefined>;
  fetchRtcSettings: (input: {
    url?: string;
    bearerToken?: string;
    channel: string;
  }) => Promise<RtcSettings>;
};

/** Offline / local-mesh default — no Laravel auth or RTC config fetch. */
export const DEFAULT_DOCS_COLLAB_WIRE: DocsCollabWireOperations = {
  async fetchAuthToken() {
    return undefined;
  },
  async fetchRtcSettings() {
    return applyRtcDebugOverrides({ ...DEFAULT_RTC_SETTINGS, forceRelay: false });
  },
};

import { fetchWgwAuthToken } from "@/lib/api/wgw/auth-token";
import { fetchRtcSettings } from "@/lib/api/wgw/rtc";
import type {
  DocsCollabAuthTokenInput,
  DocsCollabWireOperations,
} from "@/text-editor-core/docs-collab/docs-collab-wire";

export function createWgwDocsCollabWire(): DocsCollabWireOperations {
  return {
    fetchAuthToken: (input) => fetchWgwAuthToken(input),
    fetchRtcSettings: (input) =>
      fetchRtcSettings({
        url: input.url,
        bearerToken: input.bearerToken,
        channel: "collab",
      }),
  };
}

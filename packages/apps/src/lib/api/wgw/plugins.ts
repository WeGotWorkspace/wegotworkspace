import { wgwFetch, wgwReadJson } from "@/lib/api/wgw/http";
import type { WgwPluginDescriptor, WgwPluginsResponse } from "@/lib/api/wgw/types";

export async function fetchWgwPlugins(opts?: {
  signal?: AbortSignal;
}): Promise<WgwPluginDescriptor[]> {
  const res = await wgwFetch("/plugins", { signal: opts?.signal });
  if (!res.ok) {
    throw new Error(`GET /plugins failed (${res.status})`);
  }
  const payload = (await wgwReadJson(res)) as WgwPluginsResponse;
  if (!Array.isArray(payload.plugins)) return [];
  return payload.plugins;
}

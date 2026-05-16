export type WgwApiRuntimeConfig = {
  /** API root including `/api/v1`. */
  baseUrl: string;
  useLiveApi: boolean;
};

const runtimeStack: WgwApiRuntimeConfig[] = [];

export function normalizeWgwApiBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return "/api/v1";
  if (trimmed.endsWith("/api/v1")) return trimmed;
  return `${trimmed}/api/v1`;
}

export function pushWgwApiRuntime(config: WgwApiRuntimeConfig): () => void {
  runtimeStack.push(config);
  return () => {
    const index = runtimeStack.indexOf(config);
    if (index >= 0) runtimeStack.splice(index, 1);
  };
}

export function activeWgwApiRuntime(): WgwApiRuntimeConfig | undefined {
  return runtimeStack[runtimeStack.length - 1];
}

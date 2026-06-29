const BRAND_SUFFIX = "WeGotWorkspace";

/** `{context} | WeGotWorkspace`, or brand only when context is blank. */
export function formatBrowserTitle(context?: string): string {
  const trimmed = context?.trim();
  if (!trimmed) return BRAND_SUFFIX;
  return `${trimmed} | ${BRAND_SUFFIX}`;
}

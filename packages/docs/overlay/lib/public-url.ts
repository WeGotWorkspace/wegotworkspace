/**
 * Prefix for static paths when the app is served below a subpath (Sabre: /office).
 * Set at build time via NEXT_PUBLIC_OFFICE_BASE_PATH.
 */
export function publicUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = process.env.NEXT_PUBLIC_OFFICE_BASE_PATH ?? "";
  return `${base}${p}`;
}

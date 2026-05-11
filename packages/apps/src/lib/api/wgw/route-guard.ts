import { redirect } from "@tanstack/react-router";
import { wgwLiveApiEnabled, wgwSessionAvailable } from "@/lib/api/wgw/http";

type RouteLocationLike = {
  href?: string;
  pathname?: string;
  searchStr?: string;
  hash?: string;
};

function returnPathFromLocation(location: RouteLocationLike | undefined): string {
  if (!location) return "/drive";
  const href = typeof location.href === "string" ? location.href : "";
  if (href.startsWith("/")) return sanitizeWgwReturnPath(href);
  const pathname = typeof location.pathname === "string" ? location.pathname : "/drive";
  const search = typeof location.searchStr === "string" ? location.searchStr : "";
  const hash = typeof location.hash === "string" ? location.hash : "";
  return sanitizeWgwReturnPath(`${pathname}${search}${hash}`);
}

const ALLOWED_RETURN_PREFIXES = [
  "/admin",
  "/drive",
  "/install",
  "/login",
  "/mail",
  "/meet",
  "/notes",
  "/settings",
];

function normalizePathname(pathname: string): string {
  const withLeading = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const collapsed = withLeading.replace(/\/{2,}/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1);
  }
  return collapsed;
}

export function sanitizeWgwReturnPath(raw: string | null | undefined): string {
  const input = (raw ?? "").trim();
  if (!input.startsWith("/") || input.startsWith("//")) return "/drive";
  let url: URL;
  try {
    url = new URL(input, "https://wgw.local");
  } catch {
    return "/drive";
  }

  const pathname = normalizePathname(url.pathname || "/drive");
  const allowed = ALLOWED_RETURN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!allowed) return "/drive";

  return `${pathname}${url.search}${url.hash}`;
}

/**
 * Redirect protected routes to /login when no browser auth session exists.
 */
export function requireWgwAuth(location?: RouteLocationLike): void {
  if (!wgwLiveApiEnabled()) return;
  if (wgwSessionAvailable()) return;
  throw redirect({
    to: "/login",
    search: {
      return: returnPathFromLocation(location),
    },
  });
}

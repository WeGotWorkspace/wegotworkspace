/** Allowed protocols when opening links from a sandboxed mail body iframe. */
const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function isAllowedMailBodyLinkHref(href: string): boolean {
  try {
    return ALLOWED_LINK_PROTOCOLS.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

/**
 * Rewrites anchor tags so pop-up navigation works inside a sandboxed iframe.
 * Scripts in message HTML are not executed; this runs in the parent context.
 */
export function prepareMailBodyHtmlLinks(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const parsed = new DOMParser().parseFromString(html, "text/html");
  for (const el of parsed.querySelectorAll("a[href]")) {
    const anchor = el as HTMLAnchorElement;
    const href = anchor.getAttribute("href")?.trim() ?? "";
    if (!href || href.startsWith("#")) continue;
    if (!isAllowedMailBodyLinkHref(anchor.href)) {
      anchor.removeAttribute("href");
      continue;
    }
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  }
  return parsed.body.innerHTML;
}

export function openMailBodyLink(href: string): void {
  if (!isAllowedMailBodyLinkHref(href)) return;
  if (href.startsWith("mailto:")) {
    window.location.assign(href);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

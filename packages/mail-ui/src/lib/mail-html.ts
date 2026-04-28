/** 1×1 transparent GIF — placeholder when remote images are withheld. */
const REMOTE_IMG_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** HTML contains {@code cid:…} references (inline MIME parts), not loadable in the iframe until resolved server-side. */
export function emailHtmlHasCidReferences(html: string): boolean {
  return html !== "" && /\bcid:/i.test(html);
}

/** Remote {@code http(s)} image-like URLs in HTML (privacy-sensitive until the user opts in). */
export function emailHtmlHasRemoteImageUrls(html: string): boolean {
  if (html === "") return false;
  return (
    /\bsrc\s*=\s*["']?\s*https?:/i.test(html) ||
    /\bposter\s*=\s*["']?\s*https?:/i.test(html) ||
    /url\(\s*["']?\s*https?:/i.test(html)
  );
}

/** Replace remote image URLs with a transparent pixel so nothing is fetched until the user enables images. */
export function stripRemoteImageUrls(html: string): string {
  if (html === "" || !emailHtmlHasRemoteImageUrls(html)) {
    return html;
  }
  const px = REMOTE_IMG_PLACEHOLDER;
  let s = html;
  s = s.replace(
    /(<img\b)([^>]*?)(\ssrc\s*=\s*)(")(https?:\/\/[^"]+)(")/gi,
    `$1$2$3$4${px}$6 data-mail-blocked-src=$4$5$6`,
  );
  s = s.replace(
    /(<img\b)([^>]*?)(\ssrc\s*=\s*)(')(https?:\/\/[^']+)(')/gi,
    `$1$2$3$4${px}$6 data-mail-blocked-src=$4$5$6`,
  );
  s = s.replace(
    /(<img\b)([^>]*?)(\ssrc\s*=\s*)(https?:\/\/[^\s>]+)/gi,
    `$1$2$3${px} data-mail-blocked-src="$4"`,
  );
  s = s.replace(
    /(<video\b)([^>]*?)(\bposter\s*=\s*)(")(https?:\/\/[^"]+)(")/gi,
    `$1$2$3$4${px}$6 data-mail-blocked-poster=$4$5$6`,
  );
  s = s.replace(
    /(<video\b)([^>]*?)(\bposter\s*=\s*)(')(https?:\/\/[^']+)(')/gi,
    `$1$2$3$4${px}$6 data-mail-blocked-poster=$4$5$6`,
  );
  s = s.replace(/url\(\s*(["']?)(https?:\/\/[^"')]+)\1\s*\)/gi, `url($1${px}$1)`);
  return s;
}

/** Wrap remote HTML so links open in a new tab and layout is readable inside an iframe. */
export function wrapEmailHtmlDocument(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline'; font-src data: https:; media-src data: blob: https: http:;"><base target="_blank" rel="noopener noreferrer"><style>
    body { margin: 0; padding: 12px 4px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; word-wrap: break-word; }
    img { max-width: 100% !important; height: auto !important; }
    table { max-width: 100%; }
    pre { overflow: auto; white-space: pre-wrap; }
    a { color: #0366d6; }
  </style></head><body>${bodyHtml}</body></html>`;
}

/** One-line list preview when the server sends HTML snippets. */
export function stripHtmlForPreview(s: string, maxLen = 220): string {
  if (!s || !/<[a-z][\s\S]*>/i.test(s)) {
    return s;
  }
  const t = s
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return t.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

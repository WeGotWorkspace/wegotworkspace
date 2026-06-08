/** Shared detection for Cursor-injected commit message trailers. */

export const CURSOR_ATTRIBUTION_LINE_PATTERNS = [
  /^Co-authored-by:\s*Cursor\s*<cursoragent@cursor\.com>\s*$/i,
  /^Made-with:\s*Cursor\s*$/i,
];

export function isCursorAttributionLine(line) {
  const trimmed = line.trim();
  return CURSOR_ATTRIBUTION_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function containsCursorAttribution(message) {
  return message.split("\n").some(isCursorAttributionLine);
}

export function stripCursorAttribution(message) {
  const lines = message.split("\n");
  const kept = lines.filter((line) => !isCursorAttributionLine(line));

  while (kept.length > 0 && kept[kept.length - 1] === "") {
    kept.pop();
  }

  return kept.join("\n").concat(kept.length > 0 ? "\n" : "");
}

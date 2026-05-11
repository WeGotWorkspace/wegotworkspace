import { useCallback, useEffect, useMemo, useRef } from "react";

type MailBodyIframeProps = {
  bodyHtml: string;
};

function toIframeDoc(bodyHtml: string): string {
  const baseHead = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" />`;
  const normalizedStyle =
    "<style>html,body{margin:0!important;overflow:hidden!important;max-width:100%!important;}body{padding:12px 4px;font-family:var(--font-sans,system-ui,-apple-system,sans-serif);font-size:16px;line-height:1.65;color:color-mix(in oklab,var(--color-ink,#1f1f1f) 82%,transparent);overflow-wrap:anywhere;word-break:break-word;}p,div,span,td,th,li{font-family:inherit;}img,table{max-width:100%!important;height:auto!important;}</style>";
  return `<!doctype html><html><head>${baseHead}${normalizedStyle}</head><body>${bodyHtml}</body></html>`;
}

export function MailBodyIframe({ bodyHtml }: MailBodyIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const teardownAutoHeightRef = useRef<(() => void) | null>(null);
  const iframeDoc = useMemo(() => toIframeDoc(bodyHtml), [bodyHtml]);

  const syncHeight = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.body) return;
    const h = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body.scrollHeight ?? 0);
    frame.style.height = `${Math.max(h + 24, 160)}px`;
  }, []);

  useEffect(() => {
    return () => {
      teardownAutoHeightRef.current?.();
      teardownAutoHeightRef.current = null;
    };
  }, []);

  const handleIframeLoad = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;

    teardownAutoHeightRef.current?.();
    syncHeight();

    const update = () => syncHeight();
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (resizeObserver) {
      if (doc.documentElement) resizeObserver.observe(doc.documentElement);
      if (doc.body) resizeObserver.observe(doc.body);
    }

    const mutationObserver =
      typeof MutationObserver !== "undefined" ? new MutationObserver(update) : null;
    if (mutationObserver && doc.documentElement) {
      mutationObserver.observe(doc.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    }

    const images = Array.from(doc.images);
    for (const img of images) {
      img.addEventListener("load", update);
      img.addEventListener("error", update);
    }
    const timers = [0, 50, 200, 700].map((delay) => window.setTimeout(update, delay));

    teardownAutoHeightRef.current = () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      for (const img of images) {
        img.removeEventListener("load", update);
        img.removeEventListener("error", update);
      }
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [syncHeight]);

  useEffect(() => {
    const frame = iframeRef.current;
    if (frame) frame.style.height = "420px";
  }, [iframeDoc]);

  return (
    <iframe
      ref={iframeRef}
      title="Mail message body"
      srcDoc={iframeDoc}
      onLoad={handleIframeLoad}
      className="w-full rounded-md border border-[color-mix(in_oklab,var(--color-ink)_12%,transparent)] bg-transparent"
      style={{ height: "420px", overflow: "hidden" }}
      scrolling="no"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    />
  );
}

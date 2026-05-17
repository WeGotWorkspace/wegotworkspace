import { useCallback, useEffect, useRef } from "react";

function composeMessageMinHeightPx(): number {
  return Math.max(192, Math.round(window.innerHeight * 0.22));
}

export function useComposeMessageHeight(body: string) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);

  const syncHeight = useCallback(() => {
    const textarea = textareaRef.current;
    const field = fieldRef.current;
    if (!textarea) return;

    const minHeight = composeMessageMinHeightPx();
    const fillHeight = Math.max(minHeight, field?.clientHeight ?? 0);

    textarea.style.height = "0px";
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.max(fillHeight, contentHeight)}px`;
    textarea.style.overflowY = "hidden";
  }, []);

  useEffect(() => {
    syncHeight();
  }, [body, syncHeight]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const resizeObserver = new ResizeObserver(() => syncHeight());
    resizeObserver.observe(field);
    window.addEventListener("resize", syncHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [syncHeight]);

  return { textareaRef, fieldRef, syncHeight };
}

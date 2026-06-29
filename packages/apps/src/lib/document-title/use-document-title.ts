import { useEffect } from "react";
import { formatBrowserTitle } from "@/lib/document-title/format-browser-title";

/** Sets `document.title` from workspace context; restores on unmount or context change. */
export function useDocumentTitle(context?: string): void {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousTitle = document.title;
    document.title = formatBrowserTitle(context);

    return () => {
      document.title = previousTitle;
    };
  }, [context]);
}

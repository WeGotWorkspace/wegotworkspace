/** Re-run overlay layout when any scrollable ancestor or the viewport changes size. */
export function subscribeEditorLayoutUpdates(
  anchor: HTMLElement,
  onUpdate: () => void,
): () => void {
  const scrollers = new Set<HTMLElement>();
  let node: HTMLElement | null = anchor;

  while (node) {
    const style = getComputedStyle(node);
    if (
      /(?:auto|scroll|overlay)/.test(style.overflowY) ||
      /(?:auto|scroll|overlay)/.test(style.overflowX)
    ) {
      scrollers.add(node);
      node.addEventListener("scroll", onUpdate, { passive: true });
    }
    node = node.parentElement;
  }

  window.addEventListener("resize", onUpdate);

  return () => {
    scrollers.forEach((scroller) => scroller.removeEventListener("scroll", onUpdate));
    window.removeEventListener("resize", onUpdate);
  };
}

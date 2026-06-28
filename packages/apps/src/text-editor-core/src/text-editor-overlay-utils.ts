/** Re-run overlay layout when any scrollable ancestor or the viewport changes size. */
export function subscribeEditorLayoutUpdates(
  anchor: HTMLElement,
  onUpdate: () => void,
): () => void {
  const scrollers = collectLayoutScrollContainers(anchor);
  scrollers.forEach((scroller) => scroller.addEventListener("scroll", onUpdate, { passive: true }));

  window.addEventListener("resize", onUpdate);

  return () => {
    scrollers.forEach((scroller) => scroller.removeEventListener("scroll", onUpdate));
    window.removeEventListener("resize", onUpdate);
  };
}

function collectLayoutScrollContainers(anchor: HTMLElement): HTMLElement[] {
  const scrollers: HTMLElement[] = [];
  let node: HTMLElement | null = anchor;

  while (node) {
    const style = getComputedStyle(node);
    if (
      /(?:auto|scroll|overlay)/.test(style.overflowY) ||
      /(?:auto|scroll|overlay)/.test(style.overflowX)
    ) {
      scrollers.push(node);
    }
    node = node.parentElement;
  }

  return scrollers;
}

export function collectVerticalScrollContainers(anchor: HTMLElement): HTMLElement[] {
  const scrollers: HTMLElement[] = [];
  let node: HTMLElement | null = anchor;

  while (node) {
    const style = getComputedStyle(node);
    if (/(?:auto|scroll|overlay)/.test(style.overflowY)) {
      scrollers.push(node);
    }
    node = node.parentElement;
  }

  return scrollers;
}

/** Primary document scroller for wheel forwarding from fixed overlays (e.g. margin comments). */
export function findEditorWheelScrollTarget(anchor: HTMLElement): HTMLElement | null {
  const scrollers = collectVerticalScrollContainers(anchor);
  const sheetFill = scrollers.find((element) =>
    element.classList.contains("text-editor-sheet--fill"),
  );
  if (sheetFill) return sheetFill;
  return scrollers.at(-1) ?? null;
}

export function canElementAbsorbVerticalWheel(element: HTMLElement, deltaY: number): boolean {
  if (element.scrollHeight <= element.clientHeight + 1) return false;
  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }
  if (deltaY < 0) {
    return element.scrollTop > 0;
  }
  return false;
}

/** Forward wheel deltas to the editor when overlay chrome is not consuming them. */
export function forwardOverlayWheelToEditorScroll(
  event: WheelEvent,
  editorAnchor: HTMLElement,
  overlayRoot: HTMLElement,
): boolean {
  const card = (event.target as Element | null)?.closest(".docs-comments-floating-layer__card");
  if (!card || !overlayRoot.contains(card)) return false;

  const scrollHost = (event.target as Element | null)?.closest(".docs-comments-thread-card");
  if (
    scrollHost instanceof HTMLElement &&
    canElementAbsorbVerticalWheel(scrollHost, event.deltaY)
  ) {
    return false;
  }

  const scroller = findEditorWheelScrollTarget(editorAnchor);
  if (!scroller) return false;

  event.preventDefault();
  scroller.scrollTop += event.deltaY;
  return true;
}

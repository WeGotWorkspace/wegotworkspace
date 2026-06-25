/** Blur the active note/docs prose editor so list keyboard shortcuts can run. */
export function blurWorkspaceDetailEditor(): void {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest("[data-workspace-detail-editor]")) {
    active.blur();
  }
}

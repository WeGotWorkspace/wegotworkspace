/** True when the event target is an editable field (mirror Drive controller guard). */
export function isKeyboardFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.getAttribute("contenteditable") === "true" ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
  );
}

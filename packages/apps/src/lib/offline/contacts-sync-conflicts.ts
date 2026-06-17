type ContactsSyncConflictListener = (cardIds: string[]) => void;

let listener: ContactsSyncConflictListener | undefined;

export function setContactsSyncConflictListener(
  next: ContactsSyncConflictListener | undefined,
): void {
  listener = next;
}

export function reportContactsSyncConflicts(cardIds: string[]): void {
  if (cardIds.length === 0) return;
  listener?.(cardIds);
}

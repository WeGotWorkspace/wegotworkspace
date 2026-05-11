export type IdentifiableItem = {
  id: string;
};

export function nextActiveIdAfterRemoving(
  visibleIds: string[],
  removedIds: string[],
  activeId: string,
): string {
  if (!activeId || removedIds.length === 0 || !removedIds.includes(activeId)) {
    return activeId;
  }
  const activeIndex = visibleIds.indexOf(activeId);
  const removed = new Set(removedIds);
  const remainingVisibleIds = visibleIds.filter((id) => !removed.has(id));
  if (activeIndex < 0) return remainingVisibleIds[0] ?? "";
  return (
    remainingVisibleIds[activeIndex] ??
    remainingVisibleIds[activeIndex - 1] ??
    remainingVisibleIds[0] ??
    ""
  );
}

export function snapshotItemsById<T extends IdentifiableItem>(
  items: T[],
  ids: string[],
): Map<string, T> {
  return new Map(
    items.filter((item) => ids.includes(item.id)).map((item) => [item.id, item] as const),
  );
}

export function applyUpdaterToIds<T extends IdentifiableItem>(
  items: T[],
  ids: string[],
  updater: (item: T) => T,
): T[] {
  return items.map((item) => (ids.includes(item.id) ? updater(item) : item));
}

export function restoreItemsFromSnapshot<T extends IdentifiableItem>(
  items: T[],
  snapshotById: Map<string, T>,
): T[] {
  return items.map((item) => snapshotById.get(item.id) ?? item);
}

export function removeItemsByIds<T extends IdentifiableItem>(items: T[], ids: string[]): T[] {
  if (ids.length === 0) return items;
  const removed = new Set(ids);
  return items.filter((item) => !removed.has(item.id));
}

export function collectSnapshotValues<T extends IdentifiableItem, V>(
  snapshotById: Map<string, T>,
  picker: (item: T) => V,
): Set<V> {
  const out = new Set<V>();
  for (const item of snapshotById.values()) {
    out.add(picker(item));
  }
  return out;
}

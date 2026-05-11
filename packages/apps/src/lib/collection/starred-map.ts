/** Pure helpers for a string-id → starred map (no UI side effects). */

export function toggleStarredEntry(
  prev: Record<string, boolean>,
  id: string,
): { next: Record<string, boolean>; nowStarred: boolean } {
  const nowStarred = !prev[id];
  return { next: { ...prev, [id]: nowStarred }, nowStarred };
}

export function batchToggleStarredEntries(
  prev: Record<string, boolean>,
  ids: string[],
): { next: Record<string, boolean>; allWereStarred: boolean } {
  const allWereStarred = ids.every((id) => prev[id]);
  const next = { ...prev };
  for (const id of ids) {
    next[id] = !allWereStarred;
  }
  return { next, allWereStarred };
}

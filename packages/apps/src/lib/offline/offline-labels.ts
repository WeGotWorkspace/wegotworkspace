/** User-visible copy for offline connectivity UI. */
export type OfflineUILabels = {
  statusMessage: string;
};

export const defaultOfflineLabels: OfflineUILabels = {
  statusMessage: "Offline — changes sync when reconnected",
};

export function mergeOfflineLabels(overrides?: Partial<OfflineUILabels>): OfflineUILabels {
  return { ...defaultOfflineLabels, ...overrides };
}

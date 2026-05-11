export function createWorkspaceSource<TSource>({
  isLive,
  createLiveSource,
  createMockSource,
}: {
  isLive: boolean;
  createLiveSource: () => TSource;
  createMockSource: () => TSource;
}): TSource {
  return isLive ? createLiveSource() : createMockSource();
}

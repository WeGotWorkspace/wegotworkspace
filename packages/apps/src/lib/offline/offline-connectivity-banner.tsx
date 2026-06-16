import { useConnectivity } from "@/hooks/use-connectivity";

export function OfflineConnectivityBanner() {
  const { online } = useConnectivity();
  if (online) return null;

  return (
    <div
      className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-foreground"
      role="status"
    >
      You&apos;re offline. Changes will sync when you&apos;re back online.
    </div>
  );
}

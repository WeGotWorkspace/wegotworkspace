import { cn } from "@/lib/utils";
import type { LaatsteTestMeshPeer } from "@/text-editor-core/laatste-test-collab/mesh";

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#ea580c",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

export type LaatsteTestCollabPresenceProps = {
  localUser: { name: string; color?: string };
  peers: LaatsteTestMeshPeer[];
  className?: string;
};

export function LaatsteTestCollabPresence({
  localUser,
  peers,
  className,
}: LaatsteTestCollabPresenceProps) {
  const localColor = localUser.color ?? colorForName(localUser.name);

  return (
    <div
      className={cn("docs-collab-presence flex items-center gap-1", className)}
      aria-label="Connected editors"
    >
      <span
        className="docs-collab-presence__avatar inline-flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background"
        style={{ backgroundColor: localColor }}
        title={`${localUser.name} (you)`}
      >
        {initials(localUser.name)}
      </span>
      {peers.map((peer) => (
        <span
          key={peer.id}
          className="docs-collab-presence__avatar -ml-2 inline-flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background"
          style={{ backgroundColor: colorForName(peer.name) }}
          title={peer.name}
        >
          {initials(peer.name)}
        </span>
      ))}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

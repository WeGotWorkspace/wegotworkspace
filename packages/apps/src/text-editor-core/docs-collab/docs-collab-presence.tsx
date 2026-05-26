import { cn } from "@/lib/utils";
import type { DocsCollabMeshPeer } from "./mesh";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

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

export type DocsCollabPresenceProps = {
  localUser: { displayName: string };
  peers: DocsCollabMeshPeer[];
  className?: string;
};

export function DocsCollabPresence({ localUser, peers, className }: DocsCollabPresenceProps) {
  return (
    <div
      className={cn("docs-collab-presence flex items-center gap-1", className)}
      aria-label="Connected editors"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="docs-collab-presence__avatar docs-collab-presence__avatar--self inline-flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background">
            {sidebarAvatarInitials(localUser.displayName)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{`${localUser.displayName} (you)`}</TooltipContent>
      </Tooltip>
      {peers.map((peer) => (
        <Tooltip key={peer.id}>
          <TooltipTrigger asChild>
            <span
              className="docs-collab-presence__avatar -ml-2 inline-flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background"
              style={{ backgroundColor: colorForName(peer.name) }}
            >
              {initials(peer.name)}
            </span>
          </TooltipTrigger>
          <TooltipContent>{peer.name}</TooltipContent>
        </Tooltip>
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

function sidebarAvatarInitials(displayName: string): string {
  const initialsValue = displayName
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return initialsValue || "?";
}

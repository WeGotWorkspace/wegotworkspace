import {
  FileArchive,
  FileText,
  Folder,
  Image as ImageIcon,
  Music,
  Presentation,
  Sheet,
  Video,
  File as FileIc,
  type LucideIcon,
} from "lucide-react";
import type { FileKind } from "@/lib/files";
import { cn } from "@wgw/ui";

const map: Record<FileKind, { Icon: LucideIcon; tone: string; bg: string }> = {
  folder: { Icon: Folder, tone: "text-folder", bg: "bg-folder/10" },
  doc: { Icon: FileText, tone: "text-doc", bg: "bg-doc/10" },
  sheet: { Icon: Sheet, tone: "text-sheet", bg: "bg-sheet/10" },
  slide: { Icon: Presentation, tone: "text-slide", bg: "bg-slide/10" },
  image: { Icon: ImageIcon, tone: "text-image", bg: "bg-image/10" },
  pdf: { Icon: FileText, tone: "text-pdf", bg: "bg-pdf/10" },
  video: { Icon: Video, tone: "text-image", bg: "bg-image/10" },
  audio: { Icon: Music, tone: "text-doc", bg: "bg-doc/10" },
  archive: { Icon: FileArchive, tone: "text-muted-foreground", bg: "bg-muted" },
  other: { Icon: FileIc, tone: "text-muted-foreground", bg: "bg-muted" },
};

export function FileIcon({ kind, size = "md" }: { kind: FileKind; size?: "sm" | "md" | "lg" }) {
  const { Icon, tone, bg } = map[kind];
  const dims = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <div className={cn("flex items-center justify-center rounded-lg shrink-0", dims, bg)}>
      <Icon className={cn(ic, tone)} strokeWidth={1.75} />
    </div>
  );
}

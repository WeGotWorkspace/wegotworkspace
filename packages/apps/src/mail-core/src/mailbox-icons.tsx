import type { ReactNode } from "react";
import {
  AlertOctagon,
  Archive,
  FileEdit,
  Folder,
  Inbox as InboxIcon,
  Send,
  Star,
  Trash,
} from "lucide-react";

export function mailboxIconForLabel(label: string, className = "size-3.5"): ReactNode {
  const normalized = label.trim().toLowerCase();
  if (normalized === "inbox") return <InboxIcon className={className} />;
  if (normalized === "starred") return <Star className={className} />;
  if (normalized === "sent") return <Send className={className} />;
  if (normalized === "drafts") return <FileEdit className={className} />;
  if (normalized === "spam") return <AlertOctagon className={className} />;
  if (normalized === "archive") return <Archive className={className} />;
  if (normalized === "trash") return <Trash className={className} />;
  return <Folder className={className} />;
}

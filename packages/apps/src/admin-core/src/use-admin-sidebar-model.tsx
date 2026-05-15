import { DatabaseBackup, Database, Mail, ShieldCheck, Users, Video } from "lucide-react";
import type { AdminSection } from "@/admin-core/src/admin-types";

export type AdminSectionDescriptor = {
  id: AdminSection;
  label: string;
  description: string;
  icon: React.ReactNode;
};

export function useAdminSidebarModel(): AdminSectionDescriptor[] {
  return [
    {
      id: "users",
      label: "Users & Groups",
      description: "Directory principals and memberships",
      icon: <Users className="size-3.5" />,
    },
    {
      id: "mail",
      label: "Mail",
      description: "Server IMAP/SMTP settings",
      icon: <Mail className="size-3.5" />,
    },
    {
      id: "meet",
      label: "Meet",
      description: "Meet signaling and TURN options",
      icon: <Video className="size-3.5" />,
    },
    {
      id: "webdav",
      label: "WebDAV",
      description: "Core platform and app toggles",
      icon: <ShieldCheck className="size-3.5" />,
    },
    {
      id: "backups",
      label: "Backups",
      description: "Database and system backups",
      icon: <DatabaseBackup className="size-3.5" />,
    },
    {
      id: "updates",
      label: "Updates",
      description: "Checks, release status, and logs",
      icon: <Database className="size-3.5" />,
    },
  ];
}

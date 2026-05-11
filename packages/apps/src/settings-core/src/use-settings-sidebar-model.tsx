import { Mail as MailIcon, User, Users } from "lucide-react";
import type { SettingsSectionDescriptor } from "@/settings-core/src/settings-types";

export function useSettingsSidebarModel(): Array<
  SettingsSectionDescriptor & { icon: React.ReactNode }
> {
  return [
    {
      id: "profile",
      label: "Profile",
      description: "Your account details",
      icon: <User className="size-3.5" />,
    },
    {
      id: "memberships",
      label: "Memberships",
      description: "Groups you belong to",
      icon: <Users className="size-3.5" />,
    },
    {
      id: "mail",
      label: "Mail",
      description: "IMAP & SMTP credentials",
      icon: <MailIcon className="size-3.5" />,
    },
  ];
}

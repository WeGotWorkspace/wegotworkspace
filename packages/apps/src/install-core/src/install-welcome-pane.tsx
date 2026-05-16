import { Cloud, Database, Mail as MailIcon, Phone, ServerCog, UserPlus } from "lucide-react";
import { Card } from "@/card/src/card";
import { installWorkspacePaneClasses as c } from "@/install-core/src/install-workspace.styles";

const WELCOME_ITEMS = [
  { label: "Server check", icon: <ServerCog className="size-4" /> },
  { label: "Database", icon: <Database className="size-4" /> },
  { label: "Files, Contacts & Calendars", icon: <Cloud className="size-4" /> },
  { label: "Mail server", icon: <MailIcon className="size-4" /> },
  { label: "Meet & voice", icon: <Phone className="size-4" /> },
  { label: "Admin account", icon: <UserPlus className="size-4" /> },
];

export function InstallWelcomePane() {
  return (
    <Card title="What you'll set up">
      <ul className={c.welcomeGrid}>
        {WELCOME_ITEMS.map((item) => (
          <li key={item.label} className={c.welcomeItem}>
            <span className={c.welcomeItemIcon}>{item.icon}</span>
            <span className={c.welcomeItemLabel}>{item.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

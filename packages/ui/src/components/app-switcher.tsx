import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, NotebookPen, Mail as MailIcon, HardDrive, Settings as SettingsIcon, Shield, Check, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const APPS = [
  { id: "notes", label: "Notes", to: "/notes", icon: NotebookPen, accent: "var(--color-paper)", fg: "var(--color-ink)" },
  { id: "mail", label: "Mail", to: "/mail", icon: MailIcon, accent: "var(--mail-sidebar, #f2ce42)", fg: "var(--color-ink)" },
  { id: "drive", label: "Drive", to: "/drive", icon: HardDrive, accent: "var(--drive-sidebar, #0c8397)", fg: "#ffffff" },
  { id: "settings", label: "Settings", to: "/settings", icon: SettingsIcon, accent: "var(--settings-sidebar, #da9fb8)", fg: "var(--color-ink)" },
  { id: "meet", label: "Meet", to: "/meet", icon: Video, accent: "#4f7cff", fg: "#ffffff" },
  { id: "admin", label: "Admin", to: "/admin", icon: Shield, accent: "#2f302c", fg: "#ffffff" },
] as const;

export function AppSwitcher() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const current = APPS.find((a) => path.startsWith(a.to)) ?? APPS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-stretch gap-2 rounded-lg pr-2 pl-1 py-1 -ml-1 transition-colors hover:bg-[color-mix(in_oklab,currentColor_8%,transparent)]"
        >
          <span
            className="flex flex-col items-start leading-[0.85] tracking-wide text-left uppercase text-3xl"
            style={{ fontFamily: "var(--font-app)" }}
          >
            <span className="opacity-60">We got</span>
            <span>{current.label}</span>
          </span>
          <span className="grid grid-rows-2 leading-[0.85]">
            <span aria-hidden />
            <ChevronDown
              className="size-4 opacity-50 self-center transition-transform group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-[12rem] p-1.5"
        style={{
          backgroundColor: current.accent,
          color: current.fg,
          borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
        }}
      >
        {APPS.map((app) => {
          const Icon = app.icon;
          const active = app.id === current.id;
          return (
            <DropdownMenuItem key={app.id} asChild className="cursor-pointer">
              <Link
                to={app.to}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium"
              >
                <Icon className="size-4 opacity-70" />
                <span className="flex-1">{app.label}</span>
                {active && <Check className="size-3.5 opacity-70" />}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

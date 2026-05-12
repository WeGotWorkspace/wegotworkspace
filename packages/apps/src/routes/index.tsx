import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  HardDrive,
  Mail as MailIcon,
  NotebookPen,
  Settings as SettingsIcon,
  Shield,
  Video,
} from "lucide-react";
import { AppsHomeScreen, type AppsHomeScreenItem } from "@/apps-home-screen/src/apps-home-screen";
import { wgwFetch, wgwLiveApiEnabled, wgwReadJson } from "@/lib/api/wgw/http";
import { requireWgwAuth } from "@/lib/api/wgw/route-guard";
import type { WgwSettingsStateResponse } from "@/lib/api/wgw/types";

const ADMIN_GROUP_ID = "principals/groups/administrators";

type HomeLoaderData = {
  showAdmin: boolean;
  userDisplayName: string;
  showUserMenu: boolean;
};

async function resolveHomeLoaderData(): Promise<HomeLoaderData> {
  if (!wgwLiveApiEnabled()) {
    return {
      showAdmin: true,
      userDisplayName: "User",
      showUserMenu: false,
    };
  }

  try {
    const res = await wgwFetch("/settings/state");
    if (!res.ok) {
      return {
        showAdmin: false,
        userDisplayName: "User",
        showUserMenu: false,
      };
    }
    const state = (await wgwReadJson(res)) as WgwSettingsStateResponse;
    const userDisplayName = state.user.displayName?.trim() || state.user.username?.trim() || "User";
    const showUserMenu = Boolean(state.user.username?.trim() || state.user.email?.trim());
    return {
      showAdmin: state.groups.some((group) => group.id === ADMIN_GROUP_ID),
      userDisplayName,
      showUserMenu,
    };
  } catch {
    return {
      showAdmin: false,
      userDisplayName: "User",
      showUserMenu: false,
    };
  }
}

export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => {
    requireWgwAuth(location);
  },
  loader: resolveHomeLoaderData,
  component: HomeRoute,
  head: () => ({
    meta: [
      { title: "WeGotWorkspace" },
      { name: "description", content: "WeGotWorkspace." },
      { name: "theme-color", content: "#042318" },
      { name: "apple-mobile-web-app-title", content: "WeGotWorkspace" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/home.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/home-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/home-192.png" },
    ],
  }),
});

function HomeRoute() {
  const navigate = useNavigate();
  const { showAdmin, userDisplayName, showUserMenu } = Route.useLoaderData();

  const apps: AppsHomeScreenItem[] = [
    {
      id: "notes",
      label: "Notes",
      icon: <NotebookPen className="size-4" />,
      accent: "var(--color-paper)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/notes" }),
    },
    {
      id: "mail",
      label: "Mail",
      icon: <MailIcon className="size-4" />,
      accent: "var(--mail-sidebar, #f2ce42)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/mail" }),
    },
    {
      id: "drive",
      label: "Drive",
      icon: <HardDrive className="size-4" />,
      accent: "var(--drive-sidebar, #0c8397)",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/drive" }),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon className="size-4" />,
      accent: "var(--settings-sidebar, #da9fb8)",
      fg: "var(--color-ink)",
      onSelect: () => void navigate({ to: "/settings" }),
    },
    {
      id: "meet",
      label: "Meet",
      icon: <Video className="size-4" />,
      accent: "#4f7cff",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/meet" }),
    },
    {
      id: "admin",
      label: "Admin",
      icon: <Shield className="size-4" />,
      accent: "#2f302c",
      fg: "#ffffff",
      onSelect: () => void navigate({ to: "/admin" }),
    },
  ];

  return (
    <AppsHomeScreen
      apps={showAdmin ? apps : apps.filter((app) => app.id !== "admin")}
      className="min-h-dvh"
      userDisplayName={userDisplayName}
      showUserMenu={showUserMenu}
      onLogout={() => {
        window.location.assign("/logout");
      }}
    />
  );
}

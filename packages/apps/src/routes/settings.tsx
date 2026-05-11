import { createFileRoute } from "@tanstack/react-router";
import { SettingsApp } from "@/settings-core/src/settings-app";
import { requireWgwAuth } from "@/lib/api/wgw/route-guard";

export const Route = createFileRoute("/settings")({
  beforeLoad: ({ location }) => {
    requireWgwAuth(location);
  },
  component: SettingsApp,
  head: () => ({
    meta: [
      { title: "Settings" },
      { name: "description", content: "Manage your account, memberships, and mail." },
      { name: "theme-color", content: "#da9fb8" },
      { name: "apple-mobile-web-app-title", content: "Settings" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/settings.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/settings-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/settings-192.png" },
    ],
  }),
});

import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginScreen } from "@/login-core/src/login-screen";
import { wgwLiveApiEnabled, wgwSessionAvailable } from "@/lib/api/wgw/http";
import { sanitizeWgwReturnPath } from "@/lib/api/wgw/route-guard";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    if (!wgwLiveApiEnabled()) return;
    if (!wgwSessionAvailable()) return;
    const returnPath = sanitizeWgwReturnPath(
      typeof search.return === "string" ? search.return : undefined,
    );
    throw redirect({ to: returnPath });
  },
  component: LoginScreen,
  head: () => ({
    meta: [
      { title: "Sign in — WeGotWorkspace" },
      { name: "description", content: "Sign in to your workspace to continue." },
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

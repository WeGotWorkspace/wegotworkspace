import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/drive" });
  },
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

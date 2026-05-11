import { createFileRoute } from "@tanstack/react-router";
import { createPwaHead } from "@/lib/pwa-head";
import { MeetApp } from "@/meet-core/src/meet-app";
import { requireWgwAuth } from "@/lib/api/wgw/route-guard";

export const Route = createFileRoute("/meet")({
  beforeLoad: ({ location }) => {
    requireWgwAuth(location);
  },
  component: MeetApp,
  head: () =>
    createPwaHead({
      title: "Meet",
      description: "Video conferencing for up to 4 people.",
      themeColor: "#4f7cff",
      appTitle: "Meet",
      manifest: "/manifests/meet.webmanifest",
      icon180: "/icons/meet-180.png",
      icon192: "/icons/meet-192.png",
    }),
});

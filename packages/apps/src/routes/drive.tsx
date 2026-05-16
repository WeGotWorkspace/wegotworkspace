import { createFileRoute } from "@tanstack/react-router";
import { DriveApp } from "@/drive-core/src/drive-app";
import { createPwaHead } from "@/lib/pwa-head";
import { requireWgwAuth } from "@/lib/api/wgw/route-guard";

export const Route = createFileRoute("/drive")({
  beforeLoad: ({ location }) => {
    requireWgwAuth(location);
  },
  component: DriveRoute,
  head: () =>
    createPwaHead({
      title: "Drive",
      description: "Files and folders, organized.",
      themeColor: "#0c8397",
      appTitle: "Drive",
      manifest: "/manifests/drive.webmanifest",
      icon180: "/icons/drive-180.png",
      icon192: "/icons/drive-192.png",
    }),
});

function DriveRoute() {
  return <DriveApp />;
}

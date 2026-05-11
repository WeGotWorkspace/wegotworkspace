import { createFileRoute } from "@tanstack/react-router";
import { NotesApp } from "@/notes-core/src/notes-app";
import { createPwaHead } from "@/lib/pwa-head";
import { requireWgwAuth } from "@/lib/api/wgw/route-guard";

export const Route = createFileRoute("/notes")({
  beforeLoad: ({ location }) => {
    requireWgwAuth(location);
  },
  component: NotesRoute,
  head: () =>
    createPwaHead({
      title: "Notes",
      description: "A quiet, editorial workspace for your writing.",
      themeColor: "#23b572",
      appTitle: "Notes",
      manifest: "/manifests/notes.webmanifest",
      icon180: "/icons/notes-180.png",
      icon192: "/icons/notes-192.png",
    }),
});

function NotesRoute() {
  return <NotesApp />;
}

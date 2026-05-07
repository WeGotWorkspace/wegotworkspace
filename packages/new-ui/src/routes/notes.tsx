import { createFileRoute } from "@tanstack/react-router";
import { NotesAppRoot } from "@/notes-ui/src/notes-app-root";
import { createPwaHead } from "@/lib/pwa-head";

export const Route = createFileRoute("/notes")({
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
  return <NotesAppRoot />;
}

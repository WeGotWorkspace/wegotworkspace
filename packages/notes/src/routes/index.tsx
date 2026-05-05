import { createFileRoute } from "@tanstack/react-router";
import { NotesApp } from "@/components/notes/NotesApp";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <NotesApp />;
}

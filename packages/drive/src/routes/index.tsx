import { createFileRoute } from "@tanstack/react-router";
import { Drive } from "@/components/drive/Drive";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drive - WeGotWorkspace" },
      { name: "description", content: "A modern, beautiful drive for documents, sheets, slides, and media." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Drive />;
}

import { createFileRoute } from "@tanstack/react-router";
import { InstallApp } from "@/install-core/src/install-app";

export const Route = createFileRoute("/install")({
  component: InstallApp,
  head: () => ({
    meta: [
      { title: "Install" },
      { name: "description", content: "Set up your server." },
      { name: "theme-color", content: "#23b572" },
    ],
  }),
});

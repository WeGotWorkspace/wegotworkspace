import { createFileRoute } from "@tanstack/react-router";
import { CallApp } from "@/components/call/CallApp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Voice - WeGotWorkspace" },
      {
        name: "description",
        content:
          "Beautiful, end-to-end encrypted 1:1 video calling. Runs anywhere — even on a LAMP stack — with European STUN servers.",
      },
      { property: "og:title", content: "Aura Voice — 1:1 Video Calls" },
      {
        property: "og:description",
        content: "Premium video calling component for modern web office suites.",
      },
    ],
  }),
});

function Index() {
  return <CallApp />;
}

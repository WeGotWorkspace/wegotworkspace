import { createFileRoute } from "@tanstack/react-router";
import { MailApp } from "@/mail-core/src/mail-app";
import { createPwaHead } from "@/lib/pwa-head";

export const Route = createFileRoute("/mail")({
  component: MailRoute,
  head: () =>
    createPwaHead({
      title: "Mail",
      description: "A calm inbox for focused correspondence.",
      themeColor: "#f2ce42",
      appTitle: "Mail",
      manifest: "/manifests/mail.webmanifest",
      icon180: "/icons/mail-180.png",
      icon192: "/icons/mail-192.png",
    }),
});

function MailRoute() {
  return <MailApp />;
}

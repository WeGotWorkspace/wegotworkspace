import { createFileRoute } from "@tanstack/react-router";
import { createPwaHead } from "@/lib/pwa-head";
import { MeetApp } from "@/meet-core/src/meet-app";
import { createWgwMeetGuestApiSource } from "@/meet-core/src/meet-api-source";

export const Route = createFileRoute("/meet_/guest")({
  component: MeetGuestApp,
  head: () =>
    createPwaHead({
      title: "Join meeting",
      description: "Join a video meeting as a guest.",
      themeColor: "#4f7cff",
      appTitle: "Meet",
      manifest: "/manifests/meet.webmanifest",
      icon180: "/icons/meet-180.png",
      icon192: "/icons/meet-192.png",
    }),
});

const guestSource = createWgwMeetGuestApiSource();

function MeetGuestApp() {
  return <MeetApp source={guestSource} />;
}

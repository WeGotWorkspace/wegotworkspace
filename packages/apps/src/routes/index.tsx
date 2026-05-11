import { createFileRoute } from "@tanstack/react-router";
import { LoginScreen } from "@/login-core/src/login-screen";

export const Route = createFileRoute("/")({
  component: SignIn,
  head: () => ({
    meta: [
      { title: "Sign In — WeGotWorkspace" },
      { name: "description", content: "Sign in to WeGotWorkspace." },
      { name: "theme-color", content: "#042318" },
      { name: "apple-mobile-web-app-title", content: "WeGotWorkspace" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/home.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/home-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/home-192.png" },
    ],
  }),
});

function SignIn() {
  return <LoginScreen />;
}

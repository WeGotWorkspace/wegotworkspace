import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { wgwLogout } from "@/lib/api/wgw/http";

export const Route = createFileRoute("/logout")({
  component: LogoutRoute,
});

function LogoutRoute() {
  useEffect(() => {
    void (async () => {
      await wgwLogout();
      window.location.replace("/login");
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </main>
  );
}

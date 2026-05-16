import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { wgwLogout } from "@/lib/api/wgw/http";

export function WeGotWorkspaceLogout() {
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await wgwLogout();
      await navigate({ to: "/login" });
    })();
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </main>
  );
}

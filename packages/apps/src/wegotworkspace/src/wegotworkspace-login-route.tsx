import { redirect } from "@tanstack/react-router";
import { LoginScreen } from "@/login-core/src/login-screen";
import { wgwLiveApiEnabled, wgwSessionAvailable } from "@/lib/api/wgw/http";
import { sanitizeWgwReturnPath } from "@/lib/api/wgw/route-guard";

export type LoginSearch = {
  return?: string;
};

export function loginRouteBeforeLoad({ search }: { search: LoginSearch }) {
  if (!wgwLiveApiEnabled()) return;
  if (!wgwSessionAvailable()) return;
  const returnPath = sanitizeWgwReturnPath(search.return);
  throw redirect({ to: returnPath });
}

export function WeGotWorkspaceLoginRoute() {
  return <LoginScreen />;
}

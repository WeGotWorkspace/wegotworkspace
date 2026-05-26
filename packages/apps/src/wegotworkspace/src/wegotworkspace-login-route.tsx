import { redirect } from "@tanstack/react-router";
import { LoginScreen } from "@/login-core/src/login-screen";
import { wgwHasAuthenticatedSession, wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import { sanitizeWgwReturnPath } from "@/lib/api/wgw/route-guard";

export type LoginSearch = {
  return?: string;
};

export function loginRouteBeforeLoad({ search }: { search: LoginSearch }) {
  if (!wgwLiveApiEnabled()) return;
  if (!wgwHasAuthenticatedSession()) return;
  const returnPath = sanitizeWgwReturnPath(search.return);
  throw redirect({ to: returnPath });
}

export function WeGotWorkspaceLoginRoute() {
  return <LoginScreen />;
}

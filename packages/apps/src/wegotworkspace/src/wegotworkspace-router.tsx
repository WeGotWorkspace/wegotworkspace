import { useMemo } from "react";
import { RouterProvider, type RouterHistory } from "@tanstack/react-router";
import {
  createWeGotWorkspaceRouter,
  type WeGotWorkspaceRouteMode,
} from "@/wegotworkspace/src/wegotworkspace-routes";

type WeGotWorkspaceRouterProps = {
  mode: WeGotWorkspaceRouteMode;
  history: RouterHistory;
};

export function WeGotWorkspaceRouter({ mode, history }: WeGotWorkspaceRouterProps) {
  const router = useMemo(
    () => createWeGotWorkspaceRouter({ mode, history }),
    [history, mode],
  );

  return <RouterProvider router={router} />;
}

import { useNavigate } from "@tanstack/react-router";

/** Storybook / mock shell: navigate to `/logout` instead of hard-reloading the page. */
export function useWeGotWorkspaceLogout() {
  const navigate = useNavigate();
  return () => {
    void navigate({ to: "/logout" });
  };
}

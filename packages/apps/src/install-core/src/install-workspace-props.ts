import type { InstallAPIOperations, InstallUIData } from "@/install-core/src/install-types";

export type InstallWorkspaceProps = {
  data: InstallUIData;
  /** When set (e.g. Storybook), wizard actions use this instead of the live installer API. */
  operations?: InstallAPIOperations;
  /** Invoked when install completes with a server-provided redirect URL. */
  onInstallRedirect?: (url: string) => void;
  /** Invoked from the done step to open the admin panel. */
  onOpenAdmin?: () => void;
  className?: string;
};

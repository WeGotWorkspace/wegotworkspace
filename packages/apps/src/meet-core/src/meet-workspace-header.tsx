import {
  WorkspaceShellHeader,
  type WorkspaceShellHeaderProps,
} from "@/workspace-shell/src/workspace-shell-header";

/** @deprecated Use {@link WorkspaceShellHeader} */
export type MeetWorkspaceHeaderProps = WorkspaceShellHeaderProps;

/** @deprecated Use {@link WorkspaceShellHeader} */
export function MeetWorkspaceHeader(props: MeetWorkspaceHeaderProps) {
  return <WorkspaceShellHeader {...props} />;
}

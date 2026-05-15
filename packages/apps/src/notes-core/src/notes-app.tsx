import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import type { NotesApiSource } from "@/notes-core/src/notes-api-source";
import { useNotesAPI } from "@/notes-core/src/use-notes-api";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";

export type NotesAppProps = {
  /** When set (e.g. Storybook live story), bypasses `wgwLiveApiEnabled()` routing. */
  apiSource?: NotesApiSource;
};

export function NotesApp({ apiSource }: NotesAppProps = {}) {
  const { phase, error, retry, successVersion, listLoading, data, session, operations } =
    useNotesAPI(apiSource);

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load live notes"
      successVersion={successVersion}
      render={(key) => (
        <NotesWorkspace
          key={key}
          data={data}
          session={session}
          operations={operations}
          listLoading={listLoading}
          onLogout={() => {
            window.location.assign("/logout");
          }}
        />
      )}
    />
  );
}

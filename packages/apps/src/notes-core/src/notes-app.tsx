import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { notesStoryLabels } from "@/notes-core/src/notes-app.stories.fixtures";
import { useNotesAPI } from "@/notes-core/src/use-notes-api";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";

export function NotesApp() {
  const { phase, error, retry, successVersion, listLoading, data, session, operations } =
    useNotesAPI();

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
          labels={notesStoryLabels}
          operations={operations}
          listLoading={listLoading}
        />
      )}
    />
  );
}

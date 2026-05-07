import { LiveBootstrapErrorPanel } from "@/lib/live/live-bootstrap-error-panel";
import { notesStoryLabels } from "@/notes-core/src/notes-app.stories.fixtures";
import { useNotesAPI } from "@/notes-core/src/use-notes-api";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";

export function NotesApp() {
  const { phase, error, retry, successVersion, listLoading, data, session, operations } = useNotesAPI();

  if (phase === "error") {
    return (
      <LiveBootstrapErrorPanel title="Could not load live notes" error={error} onRetry={retry} />
    );
  }

  return (
    <NotesWorkspace
      key={successVersion}
      data={data}
      session={session}
      labels={notesStoryLabels}
      operations={operations}
      listLoading={listLoading}
    />
  );
}

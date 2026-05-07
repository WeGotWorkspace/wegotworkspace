import { NotesUI } from "@/notes-ui/src/notes-ui";
import { notesStoryLabels } from "@/notes-ui/src/notes-app.stories.fixtures";
import { fetchNotesLiveBootstrap } from "@/lib/api/wgw/notes";
import { LiveBootstrapErrorPanel } from "@/lib/live/live-bootstrap-error-panel";
import { useLiveBootstrap } from "@/lib/live/use-live-bootstrap";

export function NotesLiveRoot() {
  const { phase, error, data, load } = useLiveBootstrap(fetchNotesLiveBootstrap);

  if (phase === "loading" && !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-[color-mix(in_oklab,var(--color-ink)_65%,transparent)]">
        <p className="text-sm">Loading notes from WeGotWorkspace…</p>
      </div>
    );
  }

  if (phase === "error" || !data) {
    return (
      <LiveBootstrapErrorPanel title="Could not load live notes" error={error} onRetry={load} />
    );
  }

  return <NotesUI data={data.data} session={data.session} labels={notesStoryLabels} />;
}

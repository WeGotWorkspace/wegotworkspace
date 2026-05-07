import { NotesUI } from "@/notes-ui/src/notes-ui";
import { NotesLiveRoot } from "@/notes-ui/src/notes-live-root";
import { notesStoryLabels } from "@/notes-ui/src/notes-app.stories.fixtures";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";

export function NotesAppRoot() {
  if (wgwLiveApiEnabled()) return <NotesLiveRoot />;
  const { data, session } = createNotesAppBootstrap();
  return <NotesUI data={data} session={session} labels={notesStoryLabels} />;
}

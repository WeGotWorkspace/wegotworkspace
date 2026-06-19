import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, CalendarDays } from "lucide-react";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { Tag, TagGroup } from "@/tag/src/tag";
import { DocsCollabPresence } from "@/text-editor-core/docs-collab/docs-collab-presence";
import { TooltipProvider } from "@/ui/tooltip";
import { NoteDetailView } from "../src/note-detail-view";

import "@/notes-core/src/notes-workspace.css";

const meta: Meta<typeof NoteDetailView> = {
  title: "Apps/Notes/Note Detail View",
  component: NoteDetailView,
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={150}>
        <div className="notes-workspace notes-story-scope notes-story-scope--detail">
          <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">
            <Story />
          </div>
        </div>
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NoteDetailView>;

const base = {
  noteId: "demo-1",
  notebook: "Personal",
  lastEdited: "6 May 2026",
  tags: ["ideas", "draft"],
  body: ["First paragraph of the note.", "Second paragraph with more detail."],
  onTagAdd: () => {},
  onTagRemove: () => {},
};

export const Editable: Story = {
  args: {
    ...base,
    readOnly: false,
    pullQuote: "A quote pulled from the body.",
  },
};

export const ReadOnly: Story = {
  args: {
    ...base,
    readOnly: true,
    pullQuote: undefined,
  },
};

/** Static layout preview of Docs-style collab chrome in the meta row (live collab needs API). */
export const CollabChromePreview: Story = {
  render: () => (
    <article className="note-detail-view max-w-[680px] mx-auto">
      <div className="note-detail-view__meta-row flex items-center gap-2 md:gap-3 mb-5">
        <div className="note-detail-view__meta-tag max-w-[260px]">
          <Tag label="Personal" icon={<BookOpen className="size-3.5 opacity-70" />} />
        </div>
        <div className="note-detail-view__meta-tag note-detail-view__meta-tag--edited">
          <Tag label="Edited 6 May 2026" icon={<CalendarDays className="size-3.5 opacity-70" />} />
        </div>
        <div className="note-detail-view__collab-chrome ml-auto">
          <span
            className="note-detail-view__pending-sync"
            role="status"
            aria-live="polite"
            aria-label="Unsaved changes"
          >
            <LoadingSpinner size="sm" />
          </span>
          <DocsCollabPresence
            localUser={{ displayName: "Alex Example" }}
            peers={[
              { id: "peer-1", name: "Sam Lee" },
              { id: "peer-2", name: "Jordan Kim" },
            ]}
            connectingPeers={[{ id: "peer-3", name: "Casey Wu" }]}
          />
        </div>
      </div>
      <TagGroup
        className="note-detail-view__tag-group py-6 border-y mb-6"
        tags={["ideas", "draft"]}
        onAdd={() => {}}
        onRemoveTag={() => {}}
      />
      <p className="text-muted-foreground text-sm">
        Collab session chrome preview — spinner + peer avatars mirror Docs detail header placement.
      </p>
    </article>
  ),
};

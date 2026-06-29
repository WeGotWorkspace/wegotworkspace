import type { DocsTrackChangeGroup } from "@/text-editor-core/src/text-editor-track-changes";
import { trackChangesAuthorIdFromName } from "@/text-editor-core/src/text-editor-track-changes";
import type { TrackedChangeInfo } from "tiptap-track-changes";

const TIMESTAMP = "2026-06-01T09:05:00.000Z";

function author(name: string, color: string) {
  return {
    authorId: trackChangesAuthorIdFromName(name),
    authorName: name,
    authorColor: color,
  };
}

function buildSuggestion(
  changeId: string,
  parts: TrackedChangeInfo[],
  anchorText: string,
  summary: string,
): DocsTrackChangeGroup {
  const primary = parts[0]!;
  const from = Math.min(...parts.map((part) => part.from));
  const to = Math.max(...parts.map((part) => part.to));

  return {
    changeId,
    authorName: primary.authorName,
    authorColor: primary.authorColor,
    timestamp: primary.timestamp,
    from,
    to,
    anchorText,
    summary,
    parts,
  };
}

const alex = author("Alex Example", "#2563eb");
const sam = author("Sam Lee", "#16a34a");

export const insertSuggestion = buildSuggestion(
  "change-insert-1",
  [
    {
      changeId: "change-insert-1",
      type: "insertion",
      ...alex,
      timestamp: TIMESTAMP,
      from: 58,
      to: 65,
      text: "QA pass",
    },
  ],
  "…acceptance criteria before Friday",
  "Insert “QA pass”",
);

export const deleteSuggestion = buildSuggestion(
  "change-delete-1",
  [
    {
      changeId: "change-delete-1",
      type: "deletion",
      ...sam,
      timestamp: "2026-06-01T10:30:00.000Z",
      from: 10,
      to: 15,
      text: "draft",
    },
  ],
  "…the launch checklist for the release",
  "Delete “draft”",
);

export const replaceSuggestion = buildSuggestion(
  "change-replace-1",
  [
    {
      changeId: "change-replace-1",
      type: "deletion",
      ...alex,
      timestamp: TIMESTAMP,
      from: 10,
      to: 15,
      text: "draft",
    },
    {
      changeId: "change-replace-1",
      type: "insertion",
      ...alex,
      timestamp: TIMESTAMP,
      from: 10,
      to: 15,
      text: "final",
    },
  ],
  "…the launch checklist for the release",
  "Replace “draft” with “final”",
);

export const formatChangeSuggestion = buildSuggestion(
  "change-format-1",
  [
    {
      changeId: "change-format-1",
      type: "formatChange",
      ...sam,
      timestamp: "2026-06-01T11:00:00.000Z",
      from: 20,
      to: 28,
      text: "headline",
      formatAdded: "bold",
      formatRemoved: "italic",
    },
  ],
  "…update the headline before review",
  "Change formatting: italic → bold",
);

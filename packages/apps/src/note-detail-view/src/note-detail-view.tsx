import { BookOpen, CalendarDays } from "lucide-react";
import { Tag, TagGroup } from "@/tag/src/tag";
import { cn } from "@/lib/utils";
import { noteBodyToMarkdown } from "@/lib/models/note-body-markdown";
import { NoteTextEditorBody } from "@/note-detail-view/src/note-text-editor-body";

export type NoteDetailViewProps = {
  /** Used for React keys on editors when switching notes. */
  noteId: string;
  notebook?: string;
  /** Shown in the meta row (e.g. note’s edited date string). */
  lastEdited?: string;
  /** Prepended before `lastEdited` in the meta row; default `Edited `. */
  editedLabel?: string;
  tags: string[];
  onTagAdd?: () => void;
  onTagRemove?: (label: string) => void;
  pullQuote?: string;
  /** Body paragraphs; persisted as markdown via {@link noteBodyToMarkdown}. */
  body: string[];
  /**
   * Persisted as a single markdown string (`body` becomes `[markdown]`).
   * When omitted but `readOnly` is false, the body shows as read-only plain text.
   */
  onBodyMarkdownChange?: (markdown: string) => void;
  /** When `true`, body and tags are display-only. Default `false` (editing on). */
  readOnly?: boolean;
  className?: string;
};

export function NoteDetailView({
  noteId,
  notebook,
  lastEdited,
  editedLabel = "Edited ",
  tags,
  onTagAdd,
  onTagRemove,
  pullQuote,
  body,
  onBodyMarkdownChange,
  readOnly = false,
  className,
}: NoteDetailViewProps) {
  const markdown = noteBodyToMarkdown(body);
  const metaTags = [
    ...(notebook != null && notebook !== ""
      ? [
          {
            key: "notebook",
            label: notebook,
            icon: <BookOpen className="size-3.5 opacity-70" />,
            wrapperClassName: "note-detail-view__meta-tag max-w-[260px]",
          },
        ]
      : []),
    ...(lastEdited != null && lastEdited !== ""
      ? [
          {
            key: "edited",
            label: `${editedLabel}${lastEdited}`,
            icon: <CalendarDays className="size-3.5 opacity-70" />,
            wrapperClassName: "note-detail-view__meta-tag note-detail-view__meta-tag--edited",
          },
        ]
      : []),
  ];

  return (
    <article className={cn("max-w-[680px] mx-auto", className)}>
      {metaTags.length > 0 ? (
        <div className="flex items-center gap-2 md:gap-3 mb-5">
          {metaTags.map((tag) => (
            <div key={tag.key} className={tag.wrapperClassName}>
              <Tag label={tag.label} icon={tag.icon} />
            </div>
          ))}
        </div>
      ) : null}

      <TagGroup
        className="note-detail-view__tag-group py-6 border-y mb-6"
        tags={tags}
        readonly={readOnly}
        onAdd={readOnly ? undefined : onTagAdd}
        onRemoveTag={readOnly ? undefined : onTagRemove}
      />

      {pullQuote ? (
        <p className="note-detail-view__pull-quote text-xl leading-snug mb-8 font-medium">
          “{pullQuote}”
        </p>
      ) : null}

      <NoteTextEditorBody
        noteId={noteId}
        contentRevision={lastEdited ?? ""}
        initialMarkdown={markdown}
        readOnly={readOnly || !onBodyMarkdownChange}
        onMarkdownChange={readOnly ? undefined : onBodyMarkdownChange}
      />
    </article>
  );
}

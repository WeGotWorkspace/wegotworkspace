import { BookOpen, CalendarDays } from "lucide-react";
import { EditableText } from "@/editable-text/src/editable-text";
import { Tag, TagGroup } from "@/tag/src/tag";
import { cn } from "@/lib/utils";

export type NoteDetailViewProps = {
  /** Used for React keys on editors when switching notes. */
  noteId: string;
  notebook?: string;
  /** Shown in the meta row (e.g. note’s edited date string). */
  lastEdited?: string;
  /** Prepended before `lastEdited` in the meta row; default `Edited `. */
  editedLabel?: string;
  title?: string;
  onTitleChange?: (value: string) => void;
  tags: string[];
  onTagAdd?: () => void;
  onTagRemove?: (label: string) => void;
  pullQuote?: string;
  /** Body paragraphs; each is editable when `readOnly` is false. */
  body: string[];
  onBodyParagraphChange?: (index: number, value: string) => void;
  /** When `true`, title, body, and tags are display-only. Default `false` (editing on). */
  readOnly?: boolean;
  className?: string;
};

export function NoteDetailView({
  noteId,
  notebook,
  lastEdited,
  editedLabel = "Edited ",
  title,
  onTitleChange,
  tags,
  onTagAdd,
  onTagRemove,
  pullQuote,
  body,
  onBodyParagraphChange,
  readOnly = false,
  className,
}: NoteDetailViewProps) {
  const editable = !readOnly;

  return (
    <article className={cn("max-w-[680px] mx-auto", className)}>
      {(notebook != null && notebook !== "") || (lastEdited != null && lastEdited !== "") ? (
        <div className="flex items-center gap-2 md:gap-3 mb-5">
          {notebook != null && notebook !== "" ? (
            <div className="max-w-[260px]">
              <Tag label={notebook} icon={<BookOpen className="size-3.5 opacity-70" />} />
            </div>
          ) : null}
          {lastEdited != null && lastEdited !== "" ? (
            <Tag
              label={`${editedLabel}${lastEdited}`}
              icon={<CalendarDays className="size-3.5 opacity-70" />}
              colors={{
                backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                color: "color-mix(in oklab, var(--color-ink) 58%, transparent)",
              }}
            />
          ) : null}
        </div>
      ) : null}

      <EditableText
        key={`${noteId}-title`}
        value={title ?? ""}
        onChange={onTitleChange ?? (() => {})}
        as="h1"
        editable={editable}
        className="text-3xl md:text-4xl font-semibold leading-[1.1] tracking-tight mb-8 md:mb-10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm"
        style={{ fontFamily: "var(--font-sans)", color: "var(--color-ink)" }}
        singleLine
        placeholder="Untitled"
      />

      <TagGroup
        className="py-6 border-y mb-12"
        style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
        tags={tags}
        readonly={readOnly}
        onAdd={readOnly ? undefined : onTagAdd}
        onRemoveTag={readOnly ? undefined : onTagRemove}
      />

      {pullQuote ? (
        <p
          className="text-xl leading-snug mb-8 font-medium"
          style={{
            fontFamily: "var(--font-sans)",
            color: "color-mix(in oklab, var(--color-ink) 85%, transparent)",
          }}
        >
          “{pullQuote}”
        </p>
      ) : null}

      <div className="space-y-6">
        {body.map((p, i) => (
          <EditableText
            key={`${noteId}-p-${i}`}
            value={p}
            onChange={(v) => onBodyParagraphChange?.(i, v)}
            as="p"
            editable={editable}
            className="text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm whitespace-pre-wrap"
            style={{ color: "color-mix(in oklab, var(--color-ink) 80%, transparent)" }}
            placeholder="Write…"
          />
        ))}
      </div>
    </article>
  );
}

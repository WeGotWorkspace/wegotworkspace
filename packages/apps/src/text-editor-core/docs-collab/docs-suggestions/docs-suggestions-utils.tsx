import type { TrackedChangeInfo } from "tiptap-track-changes";
import { Tag } from "@/tag/src/tag";

function formatChangeLabel(parts: TrackedChangeInfo[]): string | null {
  const formatChange = parts.find((part) => part.type === "formatChange");
  if (!formatChange) return null;

  const added = formatChange.formatAdded;
  const removed = formatChange.formatRemoved;
  if (added && removed) return `Change formatting: ${removed} → ${added}`;
  if (added) return `Add ${added} formatting`;
  if (removed) return `Remove ${removed} formatting`;
  return "Format change";
}

function getChangeTypeTagLabel(parts: TrackedChangeInfo[]): string {
  const insertion = parts.find((part) => part.type === "insertion");
  const deletion = parts.find((part) => part.type === "deletion");
  const formatChange = parts.find((part) => part.type === "formatChange");

  if (formatChange) return "Format changed";
  if (insertion && deletion) return "Replaced";
  if (insertion) return "Inserted";
  if (deletion) return "Deleted";
  return "Changed";
}

export type SuggestionDiffBodyProps = {
  parts: TrackedChangeInfo[];
  /** Plain-text summary for screen readers (from `DocsTrackChangeGroup.summary`). */
  ariaLabel: string;
};

export function SuggestionDiffBody({ parts, ariaLabel }: SuggestionDiffBodyProps) {
  const insertion = parts.find((part) => part.type === "insertion");
  const deletion = parts.find((part) => part.type === "deletion");
  const formatLabel = formatChangeLabel(parts);
  const changeTypeTagLabel = getChangeTypeTagLabel(parts);

  return (
    <div className="docs-suggestion-card__diff-block" aria-label={ariaLabel}>
      <Tag label={changeTypeTagLabel} />
      {formatLabel ? (
        <p className="docs-suggestion-card__diff docs-suggestion-card__diff--format">
          {formatLabel}
        </p>
      ) : (
        <p className="docs-suggestion-card__diff">
          {deletion ? (
            <del className="docs-suggestion-card__deletion">{deletion.text || "Delete text"}</del>
          ) : null}
          {deletion && insertion ? (
            <span className="docs-suggestion-card__diff-arrow" aria-hidden>
              {" → "}
            </span>
          ) : null}
          {insertion ? (
            <ins className="docs-suggestion-card__insertion">{insertion.text || "Insert text"}</ins>
          ) : null}
        </p>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { Tag } from "@/tag/src/tag";
import type { useDocsController } from "@/docs-core/src/use-docs-controller";

type DocsController = ReturnType<typeof useDocsController>;

export type DocsStatsFooterProps = {
  controller: DocsController;
  status?: ReactNode;
};

export type DocsEditorStatsFooterProps = {
  wordCount: number;
  characterCount: number;
  statsWordsLabel: (count: number) => string;
  statsCharactersLabel: (count: number) => string;
  status?: ReactNode;
};

export function DocsEditorStatsFooter({
  wordCount,
  characterCount,
  statsWordsLabel,
  statsCharactersLabel,
  status,
}: DocsEditorStatsFooterProps) {
  return (
    <footer className="docs-workspace__stats-footer" aria-live="polite">
      <div className="docs-workspace__stats-footer-group">
        <Tag
          label={statsWordsLabel(wordCount)}
          colors={{
            backgroundColor: "var(--docs-stat-tag-bg)",
            color: "var(--docs-stat-tag-color)",
          }}
        />
        <span className="docs-workspace__stats-footer-tag--characters">
          <Tag
            label={statsCharactersLabel(characterCount)}
            colors={{
              backgroundColor: "var(--docs-stat-tag-bg)",
              color: "var(--docs-stat-tag-color)",
            }}
          />
        </span>
      </div>
      {status ? (
        <div className="docs-workspace__stats-footer-group docs-workspace__stats-footer-group--end">
          {status}
        </div>
      ) : null}
    </footer>
  );
}

export function DocsStatsFooter({ controller, status }: DocsStatsFooterProps) {
  if (!controller.hasFile) return null;

  return (
    <DocsEditorStatsFooter
      wordCount={controller.wordCount}
      characterCount={controller.characterCount}
      statsWordsLabel={controller.labels.statsWords}
      statsCharactersLabel={controller.labels.statsCharacters}
      status={status}
    />
  );
}

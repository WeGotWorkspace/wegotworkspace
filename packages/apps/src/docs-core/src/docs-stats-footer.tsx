import { Tag } from "@/tag/src/tag";
import type { useDocsController } from "@/docs-core/src/use-docs-controller";

type DocsController = ReturnType<typeof useDocsController>;

export function DocsStatsFooter({ controller }: { controller: DocsController }) {
  if (!controller.hasFile) return null;

  return (
    <footer className="docs-workspace__stats-footer" aria-live="polite">
      <Tag
        label={controller.labels.statsWords(controller.wordCount)}
        colors={{
          backgroundColor: "var(--docs-stat-tag-bg)",
          color: "var(--docs-stat-tag-color)",
        }}
      />
      <Tag
        label={controller.labels.statsCharacters(controller.characterCount)}
        colors={{
          backgroundColor: "var(--docs-stat-tag-bg)",
          color: "var(--docs-stat-tag-color)",
        }}
      />
    </footer>
  );
}

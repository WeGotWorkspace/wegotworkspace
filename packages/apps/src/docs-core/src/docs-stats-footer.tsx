import { Tag } from "@/tag/src/tag";
import { DocsPageSizeSelect } from "@/docs-core/src/docs-page-size-select";
import type { TextEditorPageFormat } from "@/text-editor-core/src/text-editor-pagination";
import type { useDocsController } from "@/docs-core/src/use-docs-controller";

type DocsController = ReturnType<typeof useDocsController>;

export type DocsStatsFooterProps = {
  controller: DocsController;
  /** When both are provided, renders the page-size picker on the right. */
  pageFormat?: TextEditorPageFormat;
  onPageFormatChange?: (format: TextEditorPageFormat) => void;
};

export function DocsStatsFooter({
  controller,
  pageFormat,
  onPageFormatChange,
}: DocsStatsFooterProps) {
  if (!controller.hasFile) return null;

  const showPageSize = pageFormat !== undefined && onPageFormatChange !== undefined;

  return (
    <footer className="docs-workspace__stats-footer" aria-live="polite">
      <div className="docs-workspace__stats-footer-group">
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
      </div>
      {showPageSize ? (
        <div className="docs-workspace__stats-footer-group docs-workspace__stats-footer-group--end">
          <DocsPageSizeSelect
            value={pageFormat}
            onValueChange={onPageFormatChange}
            label={controller.labels.pageSizeLabel}
          />
        </div>
      ) : null}
    </footer>
  );
}

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { TextEditor, TEXT_EDITOR_FORMAT_BAR_FULL } from "@/text-editor-core/src";
import { DocsStatsFooter } from "@/docs-core/src/docs-stats-footer";
import {
  DEFAULT_TEXT_EDITOR_PAGE_FORMAT,
  type TextEditorPageFormat,
} from "@/text-editor-core/src/text-editor-pagination";
import type { useDocsController } from "@/docs-core/src/use-docs-controller";

type DocsController = ReturnType<typeof useDocsController>;

export type DocsMainPaneProps = {
  controller: DocsController;
  fileKey: string;
  viewSource: boolean;
  onEditorReady: (editor: Editor | null) => void;
  /** Controlled visual page size (in-memory UI state). */
  pageFormat?: TextEditorPageFormat;
  onPageFormatChange?: (format: TextEditorPageFormat) => void;
  /** Initial visual page size when uncontrolled (defaults to A4). */
  initialPageFormat?: TextEditorPageFormat;
};

export function DocsMainPane({
  controller,
  fileKey,
  viewSource,
  onEditorReady,
  pageFormat: pageFormatProp,
  onPageFormatChange,
  initialPageFormat = DEFAULT_TEXT_EDITOR_PAGE_FORMAT,
}: DocsMainPaneProps) {
  const [uncontrolledPageFormat, setUncontrolledPageFormat] =
    useState<TextEditorPageFormat>(initialPageFormat);
  const pageFormat = pageFormatProp ?? uncontrolledPageFormat;
  const setPageFormat = onPageFormatChange ?? setUncontrolledPageFormat;

  if (controller.loading) {
    return <p className="docs-workspace__loading">Loading…</p>;
  }

  if (controller.loadError) {
    return (
      <div className="docs-workspace__error">
        <p>{controller.labels.loadError}</p>
      </div>
    );
  }

  if (!controller.hasFile) {
    return (
      <div className="docs-workspace__empty">
        <p className="docs-workspace__empty-title">{controller.labels.emptyTitle}</p>
        <p className="docs-workspace__empty-description">{controller.labels.emptyDescription}</p>
      </div>
    );
  }

  const isPlainText = controller.isPlainTextDocument;

  return (
    <div className="docs-workspace__editor">
      <TextEditor
        key={fileKey}
        format={controller.editorFormat}
        content={controller.content}
        sheetFill
        pagination
        pageFormat={pageFormat}
        viewSource={viewSource}
        formatBar={isPlainText ? false : { groups: TEXT_EDITOR_FORMAT_BAR_FULL, showPrint: false }}
        onUpdate={({ content }) => controller.onContentChange(content)}
        onEditorReady={onEditorReady}
      />
      <DocsStatsFooter
        controller={controller}
        pageFormat={pageFormat}
        onPageFormatChange={setPageFormat}
      />
    </div>
  );
}

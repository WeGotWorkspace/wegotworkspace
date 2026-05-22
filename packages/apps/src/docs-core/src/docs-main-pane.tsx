import type { Editor } from "@tiptap/react";
import { TextEditor, TEXT_EDITOR_FORMAT_BAR_FULL } from "@/text-editor-core/src";
import type { useDocsController } from "@/docs-core/src/use-docs-controller";

type DocsController = ReturnType<typeof useDocsController>;

export type DocsMainPaneProps = {
  controller: DocsController;
  fileKey: string;
  onEditorReady: (editor: Editor | null) => void;
};

export function DocsMainPane({ controller, fileKey, onEditorReady }: DocsMainPaneProps) {
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

  return (
    <div className="docs-workspace__editor">
      <TextEditor
        key={fileKey}
        format="markdown"
        content={controller.content}
        sheetFill
        formatBar={{ groups: TEXT_EDITOR_FORMAT_BAR_FULL, showPrint: true }}
        onUpdate={({ content }) => controller.onContentChange(content)}
        onEditorReady={onEditorReady}
      />
    </div>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import {
  TEXT_EDITOR_PAGE_FORMATS,
  type TextEditorPageFormat,
} from "@/text-editor-core/src/text-editor-pagination";

export type DocsPageSizeSelectProps = {
  value: TextEditorPageFormat;
  onValueChange: (format: TextEditorPageFormat) => void;
  /** Accessible name for the control (defaults to "Page size"). */
  label?: string;
};

/**
 * Compact page-size picker for the Docs footer. Pagination is visual-only, so
 * the choice is in-memory UI state and never written to the document.
 */
export function DocsPageSizeSelect({
  value,
  onValueChange,
  label = "Page size",
}: DocsPageSizeSelectProps) {
  return (
    <div className="docs-page-size-select">
      <Select value={value} onValueChange={(next) => onValueChange(next as TextEditorPageFormat)}>
        <SelectTrigger className="docs-page-size-select__trigger" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TEXT_EDITOR_PAGE_FORMATS.map((format) => (
            <SelectItem key={format.id} value={format.id}>
              {format.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

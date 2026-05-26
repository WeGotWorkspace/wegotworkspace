import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export type TextEditorSourceProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  editable?: boolean;
  /** Shown in `aria-label` (e.g. HTML or Markdown). */
  formatLabel?: string;
  className?: string;
};

/** Logical line count for source gutter (one number per newline in the buffer). */
export function textEditorSourceLineCount(text: string): number {
  if (text.length === 0) return 1;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split("\n").length;
}

/**
 * Plain-text source editor with a scroll-synced line-number gutter.
 */
export function TextEditorSource({
  value,
  onChange,
  onFocus,
  onBlur,
  editable = true,
  formatLabel = "source",
  className,
}: TextEditorSourceProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => textEditorSourceLineCount(value), [value]);

  const syncGutterScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const gutter = gutterRef.current;
    if (!textarea || !gutter) return;
    gutter.scrollTop = textarea.scrollTop;
  }, []);

  const gutterLabels = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n"),
    [lineCount],
  );

  return (
    <div className={cn("text-editor-source", className)}>
      <div className="text-editor-source__layout">
        <div ref={gutterRef} className="text-editor-source__gutter" aria-hidden>
          <pre className="text-editor-source__gutter-lines">{gutterLabels}</pre>
        </div>
        <textarea
          ref={textareaRef}
          className="text-editor-source__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={syncGutterScroll}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={!editable}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label={`${formatLabel} source`}
        />
      </div>
    </div>
  );
}

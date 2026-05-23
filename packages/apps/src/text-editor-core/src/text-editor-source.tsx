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

function lineCount(text: string): number {
  if (text.length === 0) return 1;
  return text.split("\n").length;
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
  const lines = useMemo(() => lineCount(value), [value]);

  const syncGutterScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const gutter = gutterRef.current;
    if (!textarea || !gutter) return;
    gutter.scrollTop = textarea.scrollTop;
  }, []);

  const lineNumbers = useMemo(
    () => Array.from({ length: lines }, (_, index) => String(index + 1)),
    [lines],
  );

  return (
    <div className={cn("text-editor-source", className)}>
      <div className="text-editor-source__layout">
        <div ref={gutterRef} className="text-editor-source__gutter" aria-hidden>
          {lineNumbers.map((label, index) => (
            <div key={index} className="text-editor-source__line-number">
              {label}
            </div>
          ))}
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

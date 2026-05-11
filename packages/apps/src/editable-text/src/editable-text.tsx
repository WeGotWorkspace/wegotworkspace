import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export function EditableText({
  value,
  onChange,
  as,
  className,
  style,
  singleLine,
  placeholder,
  editable = true,
}: {
  value: string;
  onChange: (v: string) => void;
  as: "h1" | "p";
  className?: string;
  style?: React.CSSProperties;
  singleLine?: boolean;
  placeholder?: string;
  /** When `false`, renders static text (no contenteditable). */
  editable?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editable) return;
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value, editable]);

  if (!editable) {
    const Comp = as;
    const showTitlePlaceholder = as === "h1" && !value;
    return (
      <Comp className={cn(className, showTitlePlaceholder && "opacity-50")} style={style}>
        {showTitlePlaceholder ? (placeholder ?? "") : value}
      </Comp>
    );
  }

  const commit = () => {
    const v = ref.current?.textContent ?? "";
    if (v !== value) onChange(v);
  };

  const props = {
    ref: ref as React.RefObject<HTMLHeadingElement & HTMLParagraphElement>,
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: true,
    "data-placeholder": placeholder,
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (singleLine && e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
    },
    className,
    style,
  };

  return as === "h1" ? <h1 {...props} /> : <p {...props} />;
}

import { useEffect, useRef } from "react";

export function EditableText({
  value,
  onChange,
  as,
  className,
  style,
  singleLine,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  as: "h1" | "p";
  className?: string;
  style?: React.CSSProperties;
  singleLine?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

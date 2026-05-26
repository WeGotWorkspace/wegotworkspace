import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

import "@/dialogs/src/rename-filename-field.css";

export type RenameFilenameFieldProps = {
  baseName: string;
  onBaseNameChange: (value: string) => void;
  /** When set, shown read-only after the input (e.g. `.md`). */
  extension?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
};

export function RenameFilenameField({
  baseName,
  onBaseNameChange,
  extension,
  disabled = false,
  autoFocus = false,
  placeholder,
  className,
  onEnter,
}: RenameFilenameFieldProps) {
  const showExtension = Boolean(extension);

  if (!showExtension) {
    return (
      <Input
        autoFocus={autoFocus}
        className={className}
        placeholder={placeholder}
        value={baseName}
        disabled={disabled}
        onChange={(event) => onBaseNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter?.();
          }
        }}
      />
    );
  }

  return (
    <div className={cn("rename-filename-field", className)}>
      <Input
        autoFocus={autoFocus}
        className="rename-filename-field__input"
        placeholder={placeholder}
        value={baseName}
        disabled={disabled}
        aria-describedby="rename-filename-extension"
        onChange={(event) => onBaseNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter?.();
          }
        }}
      />
      <span id="rename-filename-extension" className="rename-filename-field__extension" aria-hidden>
        {extension}
      </span>
    </div>
  );
}

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAILBOX_PICKER_ROOT, listMailboxPickerFolders } from "@/lib/mail-folder-picker";
import type { Folder } from "@/lib/mail-store";

type Props = {
  folders: Folder[];
  value: string;
  onValueChange: (value: string) => void;
  /** When true, adds a first option (value {@link MAILBOX_PICKER_ROOT}) for top-level mailboxes. */
  includeTopLevel?: boolean;
  topLevelLabel?: string;
  excludeFolderIds?: string[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

export function MailboxFolderSelect({
  folders,
  value,
  onValueChange,
  includeTopLevel = false,
  topLevelLabel = "Top level",
  excludeFolderIds,
  placeholder = "Choose a mailbox…",
  id,
  disabled = false,
}: Props) {
  const items = useMemo(() => {
    let list = listMailboxPickerFolders(folders);
    if (excludeFolderIds?.length) {
      const ex = new Set(excludeFolderIds);
      list = list.filter((f) => !ex.has(f.id));
    }
    return list;
  }, [folders, excludeFolderIds]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeTopLevel ? (
          <SelectItem value={MAILBOX_PICKER_ROOT}>{topLevelLabel}</SelectItem>
        ) : null}
        {items.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

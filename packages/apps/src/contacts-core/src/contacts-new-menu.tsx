import { Upload, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Button } from "@/button/src/button";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

export type ContactsNewMenuProps = {
  labels: ContactsUILabels;
  onCreateContact: () => void;
  onImportVcf: () => void;
  disabled?: boolean;
};

export function ContactsNewMenu({
  labels,
  onCreateContact,
  onImportVcf,
  disabled = false,
}: ContactsNewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          label={labels.newContact}
          icon={<UserPlus />}
          size="lg"
          pill
          variant="primary"
          className="w-full"
          disabled={disabled}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="min-w-[14rem]">
        <DropdownMenuItem onClick={onCreateContact} className="cursor-pointer gap-2.5 py-2">
          <UserPlus className="size-4 opacity-70" />
          <span>{labels.createContact}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportVcf} className="cursor-pointer gap-2.5 py-2">
          <Upload className="size-4 opacity-70" />
          <span>{labels.importVcf}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

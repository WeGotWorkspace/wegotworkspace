import {
  Upload,
  FolderPlus,
  Plus,
  FileText,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Button } from "@/button/src/button";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";

export type DriveBlankKind = "doc" | "sheet" | "slides";

export type DriveNewMenuProps = {
  labels: DriveUILabels;
  onCreateFolder: () => void;
  onUploadFiles: () => void;
  onCreateBlank: (kind: DriveBlankKind) => void;
};

export function DriveNewMenu({ labels, onCreateFolder, onUploadFiles, onCreateBlank }: DriveNewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          label={labels.newButton}
          icon={<Plus />}
          size="lg"
          pill
          variant="primary"
          className="w-full"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="min-w-[14rem]">
        <DropdownMenuItem onClick={onCreateFolder} className="cursor-pointer gap-2.5 py-2">
          <FolderPlus className="size-4 opacity-70" />
          <span>{labels.newFolder}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUploadFiles} className="cursor-pointer gap-2.5 py-2">
          <Upload className="size-4 opacity-70" />
          <span>{labels.uploadFiles}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onCreateBlank("doc")}
          className="cursor-pointer gap-2.5 py-2"
        >
          <FileText className="size-4 opacity-70" />
          <span>{labels.newDocument}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCreateBlank("sheet")}
          className="cursor-pointer gap-2.5 py-2"
        >
          <FileSpreadsheet className="size-4 opacity-70" />
          <span>{labels.newSpreadsheet}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCreateBlank("slides")}
          className="cursor-pointer gap-2.5 py-2"
        >
          <Presentation className="size-4 opacity-70" />
          <span>{labels.newPresentation}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

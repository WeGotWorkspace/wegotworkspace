import {
  Upload,
  FolderPlus,
  Plus,
  FileText,
  FileSpreadsheet,
  Presentation,
  ScrollText,
  Table2,
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

export type DriveNewFileTemplate = {
  id: string;
  label: string;
  kind: DriveBlankKind;
};

export type DriveNewMenuProps = {
  labels: DriveUILabels;
  onCreateFolder: () => void;
  onUploadFiles: () => void;
  onCreateMarkdown?: () => void;
  onCreateSpreadsheet?: () => void;
  newFileTemplates: DriveNewFileTemplate[];
  onCreateTemplate: (templateId: string) => void;
};

export function DriveNewMenu({
  labels,
  onCreateFolder,
  onUploadFiles,
  onCreateMarkdown,
  onCreateSpreadsheet,
  newFileTemplates,
  onCreateTemplate,
}: DriveNewMenuProps) {
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
        {onCreateMarkdown ? (
          <DropdownMenuItem onClick={onCreateMarkdown} className="cursor-pointer gap-2.5 py-2">
            <ScrollText className="size-4 opacity-70" />
            <span>{labels.newMarkdown}</span>
          </DropdownMenuItem>
        ) : null}
        {onCreateSpreadsheet ? (
          <DropdownMenuItem onClick={onCreateSpreadsheet} className="cursor-pointer gap-2.5 py-2">
            <Table2 className="size-4 opacity-70" />
            <span>{labels.newSpreadsheet}</span>
          </DropdownMenuItem>
        ) : null}
        {newFileTemplates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onCreateTemplate(template.id)}
            className="cursor-pointer gap-2.5 py-2"
          >
            {template.kind === "doc" ? (
              <FileText className="size-4 opacity-70" />
            ) : template.kind === "sheet" ? (
              <FileSpreadsheet className="size-4 opacity-70" />
            ) : (
              <Presentation className="size-4 opacity-70" />
            )}
            <span>{template.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

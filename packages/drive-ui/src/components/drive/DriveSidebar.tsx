import { useState } from "react";
import { HardDrive, Star, Cloud, Plus, FileText, Sheet, Presentation, FolderPlus, Upload, ChevronDown, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { officeNewEditorHref } from "@/lib/officeLink";
import { cn } from "@/lib/utils";
import { NewFolderModal } from "./NewFolderModal";

const nav = [
  { id: "my", label: "My Drive", Icon: HardDrive },
  { id: "recent", label: "Recent", Icon: Clock },
  { id: "starred", label: "Starred", Icon: Star },
];

export function DriveSidebar({
  active,
  onSelect,
  cwd,
  myDrive,
  logoutUrl,
  onRefreshListing,
  onOpenUpload,
}: {
  active: string;
  onSelect: (id: string) => void;
  cwd: string;
  myDrive: boolean;
  logoutUrl: string;
  onRefreshListing: () => void;
  onOpenUpload: () => void;
}) {
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const actionsDisabled = !myDrive;

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.45_0.15_285)] flex items-center justify-center shadow-[var(--shadow-glow)]">
          <Cloud className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">Drive</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">WeGotWorkspace</div>
        </div>
      </div>

      <div className="px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-between shadow-[var(--shadow-soft)] h-10" size="lg" type="button">
              <span className="flex items-center">
                <Plus className="h-4 w-4 mr-2" /> New
              </span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled={actionsDisabled} onSelect={() => !actionsDisabled && setNewFolderOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" /> New folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href={officeNewEditorHref("docx")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center"
              >
                <FileText className="h-4 w-4 mr-2 text-doc" /> Blank document
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={officeNewEditorHref("xlsx")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center"
              >
                <Sheet className="h-4 w-4 mr-2 text-sheet" /> Blank spreadsheet
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={officeNewEditorHref("pptx")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center"
              >
                <Presentation className="h-4 w-4 mr-2 text-slide" /> Blank presentation
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={actionsDisabled}
              className={cn(
                "cursor-pointer transition-colors",
                "hover:bg-accent/85 focus:bg-accent",
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                "active:bg-accent/70",
              )}
              onSelect={() => !actionsDisabled && onOpenUpload()}
            >
              <Upload className="h-4 w-4 mr-2" /> Upload files…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="mt-6 px-3 space-y-0.5 flex-1">
        {nav.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              active === id
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/80 hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span className="flex-1 text-left">{label}</span>
          </button>
        ))}
      </nav>

      <div className="px-5 py-5 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
        <a
          href={logoutUrl}
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </a>
        UI from{" "}
        <a className="underline hover:text-foreground" href="https://github.com/woutervroege/drive-studio">
          drive-studio
        </a>
        . Files are the same tree as WebDAV <code className="text-[10px]">/files/</code>.
      </div>

      {newFolderOpen && myDrive && (
        <NewFolderModal
          cwd={cwd}
          onClose={() => setNewFolderOpen(false)}
          onSuccess={() => {
            setNewFolderOpen(false);
            onRefreshListing();
          }}
        />
      )}
    </aside>
  );
}

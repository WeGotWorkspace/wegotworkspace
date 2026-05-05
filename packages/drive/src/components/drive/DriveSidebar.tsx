import { useState } from "react";
import { HardDrive, Star, Cloud, Plus, FileText, Sheet, Presentation, FolderPlus, Upload, ChevronDown, Clock, LogOut } from "lucide-react";
import { Button } from "@wgw/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@wgw/ui";
import { driveCreateFile } from "@/lib/driveApi";
import { officeEditorHref } from "@/lib/officeLink";
import { cn } from "@wgw/ui";
import { NewFolderModal } from "./NewFolderModal";

const nav = [
  { id: "my", label: "My Drive", Icon: HardDrive },
  { id: "recent", label: "Recent", Icon: Clock },
  { id: "starred", label: "Starred", Icon: Star },
];

type OfficeCreateType = "docx" | "xlsx" | "pptx";

function joinDrivePath(cwd: string, name: string): string {
  const base = cwd.trim() === "" ? "/" : cwd;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanName = name.trim().replace(/^\/+/, "");
  if (normalizedBase === "" || normalizedBase === "/") {
    return `/${cleanName}`;
  }

  return `${normalizedBase}/${cleanName}`;
}

function officeLabel(ext: OfficeCreateType): string {
  if (ext === "docx") return "Document";
  if (ext === "xlsx") return "Spreadsheet";
  return "Presentation";
}

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
  const [officeCreateBusy, setOfficeCreateBusy] = useState<OfficeCreateType | null>(null);
  const [officeCreateError, setOfficeCreateError] = useState<string | undefined>(undefined);

  const actionsDisabled = !myDrive;

  async function createOfficeFile(ext: OfficeCreateType): Promise<void> {
    if (actionsDisabled || officeCreateBusy !== null) {
      return;
    }
    setOfficeCreateError(undefined);
    setOfficeCreateBusy(ext);
    const stem = `New ${officeLabel(ext)}`;
    try {
      let createdName: string | null = null;
      for (let i = 0; i < 20; i++) {
        const suffix = i === 0 ? "" : ` (${i + 1})`;
        const candidate = `${stem}${suffix}.${ext}`;
        try {
          await driveCreateFile(cwd, candidate);
          createdName = candidate;
          break;
        } catch (e) {
          const msg = (e as Error).message || "";
          if (!msg.toLowerCase().includes("already exists")) {
            throw e;
          }
        }
      }
      if (!createdName) {
        throw new Error("Could not allocate a free file name.");
      }
      onRefreshListing();
      const href = officeEditorHref(joinDrivePath(cwd, createdName));
      if (!href) {
        throw new Error("Could not open Office editor for this file.");
      }
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (e) {
      setOfficeCreateError((e as Error).message || `Could not create .${ext} file.`);
    } finally {
      setOfficeCreateBusy(null);
    }
  }

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
            <DropdownMenuItem
              disabled={actionsDisabled || officeCreateBusy !== null}
              onSelect={() => void createOfficeFile("docx")}
            >
              <FileText className="h-4 w-4 mr-2 text-doc" />
              {officeCreateBusy === "docx" ? "Creating document..." : "Blank document"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={actionsDisabled || officeCreateBusy !== null}
              onSelect={() => void createOfficeFile("xlsx")}
            >
              <Sheet className="h-4 w-4 mr-2 text-sheet" />
              {officeCreateBusy === "xlsx" ? "Creating spreadsheet..." : "Blank spreadsheet"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={actionsDisabled || officeCreateBusy !== null}
              onSelect={() => void createOfficeFile("pptx")}
            >
              <Presentation className="h-4 w-4 mr-2 text-slide" />
              {officeCreateBusy === "pptx" ? "Creating presentation..." : "Blank presentation"}
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
        {officeCreateError ? <div className="mb-3 text-destructive">{officeCreateError}</div> : null}
        <a
          href={logoutUrl}
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </a>
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

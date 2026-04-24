import { useMemo, useState } from "react";
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Archive,
  Trash2,
  AlertOctagon,
  Star,
  Plus,
  Folder as FolderIcon,
  ChevronRight,
  Pencil,
  Trash,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Folder, Message } from "@/lib/use-mail";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailboxFolderSelect } from "@/components/mail/MailboxFolderSelect";
import { MAILBOX_PICKER_ROOT } from "@/lib/mail-folder-picker";

const SYSTEM_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  archive: Archive,
  spam: AlertOctagon,
  trash: Trash2,
};

/** Sent, drafts, archive, spam, trash — listed under “Mailboxes”, not with Inbox. */
const FOLDER_SECTION_SYSTEM_ORDER = ["sent", "drafts", "archive", "spam", "trash"] as const;

export function MailRail({
  selected,
  onSelect,
  onCompose,
  logoutUrl,
  composeDisabled = false,
  folders,
  messages,
  createFolder,
  renameFolder,
  deleteFolder,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onCompose: () => void;
  logoutUrl: string;
  /** When true, Compose is disabled (e.g. mailbox not connected yet). */
  composeDisabled?: boolean;
  folders: Folder[];
  messages: Message[];
  createFolder: (name: string, parentId: string | null) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => Promise<boolean>;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<Folder | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moreMailboxesOpen, setMoreMailboxesOpen] = useState(false);

  const { inboxFolder, starredFolder, folderSectionSystemFolders, userFolders, moreMailboxesRows } =
    useMemo(() => {
      const inbox = folders.find((f) => f.system === "inbox");
      const starred = folders.find((f) => f.id === "__starred__" || f.id === "starred");
      const section = FOLDER_SECTION_SYSTEM_ORDER.map((sys) =>
        folders.find((f) => f.system === sys),
      ).filter((f): f is Folder => f != null);
      const uRoots = folders.filter(
        (f) =>
          !f.system && !f.virtual && f.id !== "starred" && f.id !== "__starred__" && !f.parentId,
      );

      const prominent = new Set<string>();
      if (inbox) prominent.add(inbox.id);
      if (starred) prominent.add(starred.id);
      for (const f of section) prominent.add(f.id);

      const walkUserTree = (id: string) => {
        prominent.add(id);
        for (const f of folders) {
          if (f.parentId === id) walkUserTree(f.id);
        }
      };
      for (const f of uRoots) walkUserTree(f.id);

      const extra = folders.filter((f) => !f.virtual && !prominent.has(f.id));
      const extraSet = new Set(extra.map((f) => f.id));
      /** Preorder within the “Other” set so children follow their parent (indent is not misleading). */
      const childrenInExtra = (parentId: string) =>
        extra
          .filter((f) => f.parentId === parentId)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      const rootsInExtra = extra
        .filter((f) => !f.parentId || !extraSet.has(f.parentId))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      const moreMailboxesRows: { folder: Folder; depth: number }[] = [];
      const seenOther = new Set<string>();
      const walkOther = (f: Folder, depth: number) => {
        if (seenOther.has(f.id)) return;
        seenOther.add(f.id);
        moreMailboxesRows.push({ folder: f, depth });
        for (const c of childrenInExtra(f.id)) {
          walkOther(c, depth + 1);
        }
      };
      for (const r of rootsInExtra) {
        walkOther(r, 0);
      }
      for (const f of extra) {
        if (!seenOther.has(f.id)) walkOther(f, 0);
      }

      return {
        inboxFolder: inbox,
        starredFolder: starred,
        folderSectionSystemFolders: section,
        userFolders: uRoots,
        moreMailboxesRows,
      };
    }, [folders]);

  const childrenOf = (id: string) => folders.filter((f) => f.parentId === id);

  const unreadCount = (id: string) => {
    const folderRow = folders.find((f) => f.id === id);
    if (folderRow && typeof folderRow.unread === "number") {
      return folderRow.unread;
    }
    if (id === "starred" || id === "__starred__") {
      return messages.filter((m) => m.starred && !m.read).length;
    }
    return messages.filter((m) => m.folderId === id && !m.read).length;
  };

  return (
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-rail text-rail-foreground">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="flex items-center gap-2 px-5 pt-6 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-saffron text-ink">
            <Mail className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-semibold tracking-tight text-rail-foreground">
              Mail
            </div>
            <div className="mt-0.5 text-[11px] text-rail-foreground/60">WeGotWorkspace</div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button
            onClick={onCompose}
            disabled={composeDisabled}
            className="h-10 w-full justify-start gap-2 bg-saffron font-medium text-ink hover:bg-saffron/90"
          >
            <Pencil className="h-4 w-4" /> Compose
          </Button>
        </div>

        <nav className="px-2 pb-4">
          <ul className="space-y-0.5">
            {inboxFolder ? (
              <li key={inboxFolder.id}>
                <button
                  type="button"
                  onClick={() => onSelect(inboxFolder.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    selected === inboxFolder.id
                      ? "bg-saffron/15 text-saffron"
                      : "text-rail-foreground/70 hover:bg-white/5 hover:text-rail-foreground"
                  }`}
                >
                  <Inbox className="h-4 w-4" />
                  <span className="flex-1 text-left">{inboxFolder.name}</span>
                  {unreadCount(inboxFolder.id) > 0 && (
                    <span className="rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-medium text-saffron">
                      {unreadCount(inboxFolder.id)}
                    </span>
                  )}
                </button>
              </li>
            ) : null}
            {starredFolder ? (
              <li key={starredFolder.id}>
                <button
                  type="button"
                  onClick={() => onSelect(starredFolder.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    selected === starredFolder.id
                      ? "bg-saffron/15 text-saffron"
                      : "text-rail-foreground/70 hover:bg-white/5 hover:text-rail-foreground"
                  }`}
                >
                  <Star className="h-4 w-4" />
                  <span className="flex-1 text-left">{starredFolder.name}</span>
                  {unreadCount(starredFolder.id) > 0 && (
                    <span className="rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-medium text-saffron">
                      {unreadCount(starredFolder.id)}
                    </span>
                  )}
                </button>
              </li>
            ) : null}
          </ul>

          <div className="mt-6 px-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-rail-foreground/50">
              Mailboxes
            </span>
          </div>

          <ul className="space-y-0.5">
            {folderSectionSystemFolders.map((f) => {
              const Icon = (f.system && SYSTEM_ICON[f.system]) || FolderIcon;
              const count = unreadCount(f.id);
              const active = selected === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(f.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-saffron/15 text-saffron"
                        : "text-rail-foreground/70 hover:bg-white/5 hover:text-rail-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{f.name}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-medium text-saffron">
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {userFolders.map((f) => (
              <FolderItem
                key={f.id}
                folder={f}
                allFolders={folders}
                children={childrenOf(f.id)}
                selected={selected}
                onSelect={onSelect}
                onAddChild={(parentId) => {
                  setNewParent(parentId);
                  setNewName("");
                  setNewOpen(true);
                }}
                onRename={(folder) => {
                  setRenameTarget(folder);
                  setRenameValue(folder.name);
                }}
                onDelete={(id) => deleteFolder(id)}
                unreadCount={unreadCount}
              />
            ))}
          </ul>

          <div className="mt-4 border-t border-white/5 pt-2">
            <div className="flex items-center gap-1 pe-2 ps-0">
              <button
                type="button"
                onClick={() => setMoreMailboxesOpen((v) => !v)}
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  moreMailboxesOpen
                    ? "bg-white/5 text-rail-foreground"
                    : "text-rail-foreground/70 hover:bg-white/5 hover:text-rail-foreground"
                }`}
                aria-expanded={moreMailboxesOpen}
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform ${moreMailboxesOpen ? "rotate-90" : ""}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">Other Mailboxes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewParent(null);
                  setNewName("");
                  setNewOpen(true);
                }}
                className="shrink-0 rounded p-1.5 text-rail-foreground/60 hover:bg-white/5 hover:text-saffron"
                aria-label="New mailbox"
                title="New mailbox"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {moreMailboxesOpen ? (
              <ul className="mt-0.5 space-y-0.5 ps-0">
                {moreMailboxesRows.map(({ folder: f, depth }) => {
                  const active = selected === f.id;
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(f.id)}
                        className={`flex w-full items-center gap-3 rounded-md py-2 pr-3 text-left text-sm transition-colors ${
                          active
                            ? "bg-saffron/15 text-saffron"
                            : "text-rail-foreground/70 hover:bg-white/5 hover:text-rail-foreground"
                        }`}
                        style={{ paddingLeft: `${12 + depth * 14}px` }}
                      >
                        <FolderIcon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </nav>

        <div className="mt-auto border-t border-white/5 p-3">
          <a
            href={logoutUrl}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-rail-foreground/70 transition-colors hover:bg-white/5 hover:text-rail-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </a>
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">New mailbox</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mailbox-name">Name</Label>
              <Input
                id="mailbox-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Receipts"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    createFolder(newName.trim(), newParent);
                    setNewOpen(false);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-mailbox-location">Location</Label>
              <MailboxFolderSelect
                id="new-mailbox-location"
                folders={folders}
                value={newParent === null ? MAILBOX_PICKER_ROOT : newParent}
                onValueChange={(v) => setNewParent(v === MAILBOX_PICKER_ROOT ? null : v)}
                includeTopLevel
                topLevelLabel="Top level"
                placeholder="Choose location…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim()}
              onClick={() => {
                createFolder(newName.trim(), newParent);
                setNewOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Rename mailbox</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameTarget && renameValue.trim()) {
                renameFolder(renameTarget.id, renameValue.trim());
                setRenameTarget(null);
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renameTarget) renameFolder(renameTarget.id, renameValue.trim());
                setRenameTarget(null);
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function FolderItem({
  folder,
  allFolders,
  children,
  selected,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
  unreadCount,
  depth = 0,
}: {
  folder: Folder;
  allFolders: Folder[];
  children: Folder[];
  selected: string;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (folder: Folder) => void;
  onDelete: (id: string) => void;
  unreadCount: (id: string) => number;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const active = selected === folder.id;
  const count = unreadCount(folder.id);
  const hasChildren = children.length > 0;

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex items-center gap-2 rounded-md py-2 pr-2 text-sm transition-colors ${
              active
                ? "bg-saffron/15 text-saffron"
                : "text-rail-foreground/70 hover:bg-white/5 hover:text-rail-foreground"
            }`}
            style={{ paddingLeft: `${12 + depth * 14}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-rail-foreground/40 hover:text-rail-foreground"
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                />
              </button>
            ) : (
              <span className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => onSelect(folder.id)}
              className="flex min-w-0 flex-1 items-center gap-3 truncate text-left"
            >
              <FolderIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{folder.name}</span>
            </button>
            {count > 0 && (
              <span className="shrink-0 rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-medium text-saffron">
                {count}
              </span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onAddChild(folder.id)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> New nested mailbox
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRename(folder)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onDelete(folder.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-3.5 w-3.5" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {expanded && hasChildren && (
        <ul className="space-y-0.5">
          {children.map((c) => (
            <FolderItem
              key={c.id}
              folder={c}
              allFolders={allFolders}
              children={allFolders.filter((x) => x.parentId === c.id)}
              selected={selected}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
              unreadCount={unreadCount}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

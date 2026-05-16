import { useRef } from "react";
import { toast } from "sonner";
import {
  Star,
  Trash2,
  X,
  Download,
  Share2,
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File as FileIcon,
  ArrowLeft,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { IconButton } from "@/button/src/button";
import type { DriveFile, FileKind } from "@/drive-core/src/drive-models";
import { kindIcon, kindIconLg } from "@/drive-core/src/drive-icons";
import type { MenuItemProps } from "@/menu-item/src/menu-item";
import { cn } from "@/lib/utils";
import { DriveDetailActionBar } from "@/drive-core/src/drive-detail-action-bar";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import "@/drive-core/src/drive-browser.css";


/* ---------------- Grid view ---------------- */

type FolderDropZoneProps = Pick<
  MenuItemProps,
  "isDropTarget" | "onDragOver" | "onDragLeave" | "onDrop"
>;

export function DriveGridView({
  items,
  imagePreviewUrls,
  selectedIds,
  starred,
  selectionMode,
  isTouch,
  isItemDragging,
  itemDragHandlers,
  folderDropZoneProps,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onTrash,
  onRename,
}: {
  items: DriveFile[];
  imagePreviewUrls: Record<string, string>;
  selectedIds: string[];
  starred: Record<string, boolean>;
  selectionMode: boolean;
  isTouch: boolean;
  isItemDragging: (id: string) => boolean;
  itemDragHandlers: (id: string) => { onDragStart: () => void; onDragEnd: () => void };
  folderDropZoneProps: (parentPath: string) => FolderDropZoneProps;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (f: DriveFile) => void;
  onLongPress: (id: string) => void;
  onStar: (id: string) => void;
  onTrash: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
}) {
  const folders = items.filter((i) => i.kind === "folder");
  const files = items.filter((i) => i.kind !== "folder");

  return (
    <div className="p-4 md:p-8 space-y-8">
      {folders.length > 0 && (
        <Section title="Folders">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {folders.map((f) => (
              <FolderTile
                key={f.id}
                file={f}
                isSelected={selectedIds.includes(f.id)}
                isStarred={!!starred[f.id]}
                isDragging={isItemDragging(f.id)}
                isTouch={isTouch}
                folderDropZone={folderDropZoneProps(
                  f.parent === "" ? f.title : `${f.parent}/${f.title}`,
                )}
                itemDragHandlers={itemDragHandlers(f.id)}
                onSelect={(e) => onSelect(f.id, e)}
                onOpen={() => onOpen(f)}
                onLongPress={() => onLongPress(f.id)}
                onStar={() => onStar(f.id)}
                onTrash={() => onTrash(f)}
                onRename={() => onRename(f)}
              />
            ))}
          </div>
        </Section>
      )}

      {files.length > 0 && (
        <Section title="Files">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {files.map((f) => (
              <FileTile
                key={f.id}
                file={f}
                previewSrc={imagePreviewUrls[f.id]}
                isSelected={selectedIds.includes(f.id)}
                isStarred={!!starred[f.id]}
                isDragging={isItemDragging(f.id)}
                isTouch={isTouch}
                itemDragHandlers={itemDragHandlers(f.id)}
                onSelect={(e) => onSelect(f.id, e)}
                onOpen={() => onOpen(f)}
                onLongPress={() => onLongPress(f.id)}
                onStar={() => onStar(f.id)}
                onTrash={() => onTrash(f)}
                onRename={() => onRename(f)}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="drive-browser-section-title"
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function useLongPress(handler: () => void) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  return {
    fired,
    start: () => {
      fired.current = false;
      t.current = setTimeout(() => {
        fired.current = true;
        handler();
        if ("vibrate" in navigator) navigator.vibrate?.(15);
      }, 450);
    },
    cancel: () => {
      if (t.current) clearTimeout(t.current);
      t.current = null;
    },
  };
}

function FolderTile({
  file,
  isSelected,
  isStarred,
  isDragging,
  isTouch,
  folderDropZone,
  itemDragHandlers,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onTrash,
  onRename,
}: {
  file: DriveFile;
  isSelected: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isTouch: boolean;
  folderDropZone: FolderDropZoneProps;
  itemDragHandlers: { onDragStart: () => void; onDragEnd: () => void };
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onLongPress: () => void;
  onStar: () => void;
  onTrash: () => void;
  onRename: () => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <button
      type="button"
      onClick={(e) => {
        if (lp.fired.current) return;
        onSelect(e);
      }}
      onDoubleClick={onOpen}
      onTouchStart={lp.start}
      onTouchEnd={lp.cancel}
      onTouchMove={lp.cancel}
      onContextMenu={(e) => {
        if (!isTouch) {
          e.preventDefault();
          onLongPress();
        }
      }}
      draggable={!isTouch}
      onDragStart={(e) => {
        itemDragHandlers.onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", file.id);
      }}
      onDragEnd={itemDragHandlers.onDragEnd}
      {...folderDropZone}
      className={cn(
        "group drive-folder-tile",
        isDragging && "drive-folder-tile--dragging",
        folderDropZone.isDropTarget && "drive-folder-tile--drop-target",
        isSelected && "drive-folder-tile--selected",
        !isSelected && !folderDropZone.isDropTarget && "drive-folder-tile--idle",
      )}
    >
      <Folder className="drive-folder-tile__icon size-5 shrink-0" fill="currentColor" fillOpacity={0.15} />
      <span className="drive-folder-tile__title">{file.title}</span>
      {isStarred ? <Star className="drive-folder-tile__star" fill="currentColor" /> : null}
      <ItemActionsMenu isStarred={isStarred} onStar={onStar} onTrash={onTrash} onRename={onRename} />
    </button>
  );
}

function FileTile({
  file,
  previewSrc,
  isSelected,
  isStarred,
  isDragging,
  isTouch,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onTrash,
  onRename,
  itemDragHandlers,
}: {
  file: DriveFile;
  previewSrc?: string;
  isSelected: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isTouch: boolean;
  itemDragHandlers: { onDragStart: () => void; onDragEnd: () => void };
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onLongPress: () => void;
  onStar: () => void;
  onTrash: () => void;
  onRename: () => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <div
      onClick={(e) => {
        if (lp.fired.current) return;
        onSelect(e);
      }}
      onDoubleClick={onOpen}
      onTouchStart={lp.start}
      onTouchEnd={lp.cancel}
      onTouchMove={lp.cancel}
      onContextMenu={(e) => {
        if (!isTouch) {
          e.preventDefault();
          onLongPress();
        }
      }}
      draggable={!isTouch}
      onDragStart={(e) => {
        itemDragHandlers.onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", file.id);
      }}
      onDragEnd={itemDragHandlers.onDragEnd}
      role="button"
      tabIndex={0}
      className={cn(
        "group drive-file-tile",
        isDragging && "drive-file-tile--dragging",
        isSelected && "drive-file-tile--selected",
      )}
    >
      {isStarred ? (
        <span className="drive-file-tile__star-badge" aria-hidden="true">
          <Star className="size-3.5" fill="currentColor" />
        </span>
      ) : null}
      <div className="drive-file-tile__preview">
        {(file.kind === "image" || file.kind === "video") && previewSrc ? (
          file.kind === "video" ? (
            <video
              src={previewSrc}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={previewSrc} alt={file.title} className="h-full w-full object-cover" />
          )
        ) : (
          <span className="[&>svg]:size-12 opacity-80">{kindIconLg[file.kind]}</span>
        )}
      </div>
      <div className="drive-file-tile__footer">
        <span className="drive-file-tile__kind-icon shrink-0">{kindIcon[file.kind]}</span>
        <span className="drive-file-tile__title">{file.title}</span>
        <ItemActionsMenu
          isStarred={isStarred}
          onStar={onStar}
          onTrash={onTrash}
          onRename={onRename}
        />
      </div>
    </div>
  );
}

function ItemActionsMenu({
  isStarred,
  onStar,
  onTrash,
  onRename,
}: {
  isStarred: boolean;
  onStar: () => void;
  onTrash: () => void;
  onRename: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="More actions"
          title="More actions"
          onClick={(event) => event.stopPropagation()}
          className="drive-item-actions-trigger"
        >
          <MoreHorizontal className="size-4" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        onClick={(event) => event.stopPropagation()}
        className="min-w-40"
      >
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            onStar();
          }}
          className="cursor-pointer gap-2.5"
        >
          <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
          {isStarred ? "Unstar" : "Star"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            onRename();
          }}
          className="cursor-pointer gap-2.5"
        >
          <Pencil className="size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            onTrash();
          }}
          className="cursor-pointer gap-2.5 text-red-600 focus:text-red-600"
        >
          <Trash2 className="size-4" />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- List view (OS-style table) ---------------- */

const KIND_LABEL: Record<FileKind, string> = {
  folder: "Folder",
  doc: "Document",
  image: "Image",
  video: "Video",
  audio: "Audio",
  archive: "Archive",
  file: "File",
};

export function DriveListView({
  items,
  activeId,
  selectedIds,
  starred,
  isTouch,
  isItemDragging,
  itemDragHandlers,
  folderDropZoneProps,
  onSelect,
  onOpen,
  onStar,
  onTrash,
  onRename,
  onLongPress,
}: {
  items: DriveFile[];
  activeId: string | null;
  selectedIds: string[];
  starred: Record<string, boolean>;
  selectionMode: boolean;
  isTouch: boolean;
  inTrash: boolean;
  isItemDragging: (id: string) => boolean;
  itemDragHandlers: (id: string) => { onDragStart: () => void; onDragEnd: () => void };
  folderDropZoneProps: (parentPath: string) => FolderDropZoneProps;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (f: DriveFile) => void;
  onStar: (id: string) => void;
  onTrash: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onLongPress: (id: string) => void;
}) {
  return (
    <div className="px-2 md:px-6 pb-8">
      <table className="drive-list-table">
        <thead>
          <tr className="drive-list-head">
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 w-[44%]">
              Name
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden md:table-cell">
              Owner
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden sm:table-cell">
              Modified
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden lg:table-cell">
              Kind
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 text-right">
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => {
            const folderPath = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
            const isSelected = selectedIds.includes(f.id);
            const isActive = f.id === activeId;
            const dropZone =
              f.kind === "folder" ? folderDropZoneProps(folderPath) : ({} as FolderDropZoneProps);
            const dragHandlers = itemDragHandlers(f.id);
            const lp = {
              start: undefined as undefined | (() => void),
              cancel: undefined as undefined | (() => void),
            };
            let pressTimer: ReturnType<typeof setTimeout> | null = null;
            const longPressStart = () => {
              pressTimer = setTimeout(() => onLongPress(f.id), 450);
            };
            const longPressCancel = () => {
              if (pressTimer) clearTimeout(pressTimer);
              pressTimer = null;
            };
            lp.start = longPressStart;
            lp.cancel = longPressCancel;

            return (
              <tr
                key={f.id}
                onClick={(e) => onSelect(f.id, e)}
                onDoubleClick={() => onOpen(f)}
                onTouchStart={lp.start}
                onTouchEnd={lp.cancel}
                onTouchMove={lp.cancel}
                onContextMenu={(e) => {
                  if (!isTouch) {
                    e.preventDefault();
                    onLongPress(f.id);
                  }
                }}
                draggable={!isTouch}
                onDragStart={(e) => {
                  dragHandlers.onDragStart();
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", f.id);
                }}
                onDragEnd={dragHandlers.onDragEnd}
                {...(f.kind === "folder" ? dropZone : {})}
                className={cn(
                  "drive-list-row group cursor-default transition-colors",
                  isItemDragging(f.id) && "drive-list-row--dragging",
                  f.kind === "folder" && dropZone.isDropTarget && "drive-list-row--drop-target",
                  isSelected && "drive-list-row--selected",
                  isActive && !isSelected && "drive-list-row--active",
                )}
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "shrink-0 [&>svg]:size-4",
                        f.kind === "folder" ? "drive-list-folder-icon" : "drive-list-file-icon",
                      )}
                    >
                      {f.kind === "folder" ? (
                        <Folder className="size-4" fill="currentColor" fillOpacity={0.18} />
                      ) : (
                        kindIcon[f.kind]
                      )}
                    </span>
                    <span className="truncate font-medium">{f.title}</span>
                    {starred[f.id] ? (
                      <Star className="size-3 shrink-0 drive-list-folder-icon" fill="currentColor" />
                    ) : null}
                    <div className="ml-auto">
                      <ItemActionsMenu
                        isStarred={!!starred[f.id]}
                        onStar={() => onStar(f.id)}
                        onTrash={() => onTrash(f)}
                        onRename={() => onRename(f)}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3 hidden md:table-cell drive-list-muted">{f.owner}</td>
                <td className="py-2 px-3 hidden sm:table-cell tabular-nums drive-list-muted">
                  {f.date}
                </td>
                <td className="py-2 px-3 hidden lg:table-cell drive-list-muted">
                  {KIND_LABEL[f.kind]}
                </td>
                <td className="py-2 px-3 text-right tabular-nums drive-list-muted">{f.size}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Detail panel ---------------- */

export function DriveDetailPanel({
  labels,
  file,
  previewSrc,
  isStarred,
  onClose,
  onDownload,
  onShare,
  onStar,
  onDelete,
  mobile,
}: {
  labels: DriveUILabels;
  file: DriveFile;
  previewSrc?: string;
  isStarred: boolean;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  onStar: () => void;
  onDelete: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      <div
        className="px-4 md:px-6 h-14 md:h-16 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
      >
        <button
          aria-label="Close"
          title={mobile ? "Back" : "Close"}
          onClick={onClose}
          className="size-9 rounded-full flex items-center justify-center"
          style={{
            color: "var(--color-ink)",
            backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          }}
        >
          {mobile ? <ArrowLeft className="size-4" /> : <X className="size-4" />}
        </button>
        <div className="drive-detail-actions flex items-center gap-1.5">
          <IconButton
            label="Download"
            onClick={() => {
              onDownload();
              toast("Download started", { icon: <Download className="size-4" /> });
            }}
            icon={<Download />}
            size="sm"
            variant="subtle"
          />
          <IconButton
            label="Share"
            onClick={() => {
              void onShare();
            }}
            icon={<Share2 />}
            size="sm"
            variant="subtle"
          />
          <IconButton
            label={isStarred ? "Unstar" : "Star"}
            onClick={onStar}
            active={isStarred}
            icon={<Star />}
            size="sm"
            variant="subtle"
          />
          <IconButton
            label="Delete"
            onClick={onDelete}
            icon={<Trash2 />}
            size="sm"
            variant="subtle"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 md:px-6 py-6">
        <div
          className="aspect-[4/3] rounded-2xl flex items-center justify-center mb-6"
          style={{
            backgroundColor: "color-mix(in oklab, var(--drive-sidebar) 14%, transparent)",
            color: "var(--drive-sidebar)",
          }}
        >
          {(file.kind === "image" || file.kind === "video") && previewSrc ? (
            file.kind === "video" ? (
              <video
                src={previewSrc}
                className="h-full w-full rounded-2xl object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={previewSrc}
                alt={file.title}
                className="h-full w-full rounded-2xl object-cover"
              />
            )
          ) : (
            <span className="[&>svg]:size-16">{kindIconLg[file.kind]}</span>
          )}
        </div>
        <p
          className="text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: "var(--drive-sidebar)" }}
        >
          {file.parent}
        </p>
        <h1
          className="text-2xl md:text-3xl leading-tight mb-4 tracking-tight break-words font-semibold"
          style={{ fontFamily: "var(--font-sans)", color: "var(--color-ink)" }}
        >
          {file.title}
        </h1>
        <dl className="space-y-2 text-sm mb-6">
          <Row label="Type" value={file.kind} />
          <Row label="Size" value={file.size} />
          <Row label="Owner" value={file.owner} />
          <Row label="Modified" value={file.date} />
        </dl>
        {file.body.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed mb-3"
            style={{ color: "color-mix(in oklab, var(--color-ink) 78%, transparent)" }}
          >
            {p}
          </p>
        ))}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between gap-4 py-1.5 border-b"
      style={{ borderColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)" }}
    >
      <dt
        className="text-[11px] uppercase tracking-wider"
        style={{ color: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
      >
        {label}
      </dt>
      <dd className="capitalize" style={{ color: "var(--color-ink)" }}>
        {value}
      </dd>
    </div>
  );
}
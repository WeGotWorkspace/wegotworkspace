import { useRef } from "react";
import { Star, Download, Folder } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import type { DriveFile, FileKind } from "@/drive-core/src/drive-models";
import { kindIcon } from "@/drive-core/src/drive-icons";
import type { MenuItemProps } from "@/menu-item/src/menu-item";
import { cn } from "@/lib/utils";
import { DriveDetailActionBar } from "@/drive-core/src/drive-detail-action-bar";
import {
  buildDriveFileActions,
  DriveFileItemActionsMenu,
} from "@/drive-core/src/drive-file-actions";
import { DriveMediaPreview } from "@/drive-core/src/drive-media-preview";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import { driveFolderUiPath } from "@/drive-core/src/drive-item-path";
import "@/drive-core/src/drive-browser.css";


/* ---------------- Grid view ---------------- */

type FolderDropZoneProps = Pick<
  MenuItemProps,
  "isDropTarget" | "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"
>;

type ItemDragHandlers = {
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
};

export function DriveGridView({
  items,
  imagePreviewUrls,
  selectedIds,
  starred,
  labels,
  inTrash,
  selectionMode,
  isTouch,
  isItemDragging,
  itemDragHandlers,
  folderDropZoneProps,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onDownload,
  onRename,
  onMove,
  onTrash,
}: {
  items: DriveFile[];
  imagePreviewUrls: Record<string, string>;
  selectedIds: string[];
  starred: Record<string, boolean>;
  labels: DriveUILabels;
  inTrash: boolean;
  selectionMode: boolean;
  isTouch: boolean;
  isItemDragging: (id: string) => boolean;
  itemDragHandlers: (id: string) => ItemDragHandlers;
  folderDropZoneProps: (destinationPath: string) => FolderDropZoneProps;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (f: DriveFile) => void;
  onLongPress: (id: string) => void;
  onStar: (id: string) => void;
  onDownload: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onMove: (file: DriveFile) => void;
  onTrash: (file: DriveFile) => void;
}) {
  const folders = items.filter((i) => i.kind === "folder");
  const files = items.filter((i) => i.kind !== "folder");

  return (
    <div className="drive-grid-layout">
      {folders.length > 0 && (
        <Section title="Folders">
          <div className="drive-grid">
            {folders.map((f) => (
              <FolderTile
                key={f.id}
                file={f}
                isSelected={selectedIds.includes(f.id)}
                isStarred={!!starred[f.id]}
                isDragging={isItemDragging(f.id)}
                isTouch={isTouch}
                folderDropZone={folderDropZoneProps(driveFolderUiPath(f))}
                itemDragHandlers={itemDragHandlers(f.id)}
                onSelect={(e) => onSelect(f.id, e)}
                onOpen={() => onOpen(f)}
                onLongPress={() => onLongPress(f.id)}
                labels={labels}
                inTrash={inTrash}
                onStar={() => onStar(f.id)}
                onDownload={onDownload}
                onRename={() => onRename(f)}
                onMove={() => onMove(f)}
                onTrash={() => onTrash(f)}
              />
            ))}
          </div>
        </Section>
      )}

      {files.length > 0 && (
        <Section title="Files">
          <div className="drive-grid">
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
                labels={labels}
                inTrash={inTrash}
                onStar={() => onStar(f.id)}
                onDownload={onDownload}
                onRename={() => onRename(f)}
                onMove={() => onMove(f)}
                onTrash={() => onTrash(f)}
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
      <h3 className="drive-item-label drive-browser-section-title">
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
  labels,
  inTrash,
  onStar,
  onDownload,
  onRename,
  onMove,
  onTrash,
}: {
  file: DriveFile;
  isSelected: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isTouch: boolean;
  folderDropZone: FolderDropZoneProps;
  itemDragHandlers: ItemDragHandlers;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onLongPress: () => void;
  labels: DriveUILabels;
  inTrash: boolean;
  onStar: () => void;
  onDownload: (file: DriveFile) => void;
  onRename: () => void;
  onMove: () => void;
  onTrash: () => void;
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
      onDragStart={itemDragHandlers.onDragStart}
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
      <DriveFileItemActions
        labels={labels}
        file={file}
        isStarred={isStarred}
        inTrash={inTrash}
        onDownload={onDownload}
        onStar={onStar}
        onRename={onRename}
        onMove={onMove}
        onDelete={onTrash}
      />
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
  labels,
  inTrash,
  onStar,
  onDownload,
  onRename,
  onMove,
  onTrash,
  itemDragHandlers,
}: {
  file: DriveFile;
  previewSrc?: string;
  isSelected: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isTouch: boolean;
  itemDragHandlers: ItemDragHandlers;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onLongPress: () => void;
  labels: DriveUILabels;
  inTrash: boolean;
  onStar: () => void;
  onDownload: (file: DriveFile) => void;
  onRename: () => void;
  onMove: () => void;
  onTrash: () => void;
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
      onDragStart={itemDragHandlers.onDragStart}
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
        <DriveMediaPreview
          file={file}
          previewSrc={previewSrc}
          mediaClassName="h-full w-full object-cover"
        />
      </div>
      <div className="drive-file-tile__footer">
        <span className="drive-file-tile__kind-icon shrink-0">{kindIcon[file.kind]}</span>
        <span className="drive-file-tile__title">{file.title}</span>
        <DriveFileItemActions
          labels={labels}
          file={file}
          isStarred={isStarred}
          inTrash={inTrash}
          onDownload={onDownload}
          onStar={onStar}
          onRename={onRename}
          onMove={onMove}
          onDelete={onTrash}
        />
      </div>
    </div>
  );
}

function DriveFileItemActions({
  labels,
  file,
  isStarred,
  inTrash,
  onDownload,
  onStar,
  onRename,
  onMove,
  onDelete,
}: {
  labels: DriveUILabels;
  file: DriveFile;
  isStarred: boolean;
  inTrash: boolean;
  onDownload: (file: DriveFile) => void;
  onStar: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete: () => void;
}) {
  const actions = buildDriveFileActions(
    labels,
    { isStarred, inTrash, canDownload: file.kind !== "folder" },
    {
      onDownload: () => onDownload(file),
      onStar,
      onRename,
      onMove,
      onDelete,
    },
  );
  return <DriveFileItemActionsMenu actions={actions} />;
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
  labels,
  inTrash,
  isTouch,
  isItemDragging,
  itemDragHandlers,
  folderDropZoneProps,
  onSelect,
  onOpen,
  onStar,
  onDownload,
  onRename,
  onMove,
  onTrash,
  onLongPress,
}: {
  items: DriveFile[];
  activeId: string | null;
  selectedIds: string[];
  starred: Record<string, boolean>;
  selectionMode: boolean;
  isTouch: boolean;
  labels: DriveUILabels;
  inTrash: boolean;
  isItemDragging: (id: string) => boolean;
  itemDragHandlers: (id: string) => ItemDragHandlers;
  folderDropZoneProps: (destinationPath: string) => FolderDropZoneProps;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (f: DriveFile) => void;
  onStar: (id: string) => void;
  onDownload: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onMove: (file: DriveFile) => void;
  onTrash: (file: DriveFile) => void;
  onLongPress: (id: string) => void;
}) {
  return (
    <div className="drive-list-view">
      <table className="drive-list-table">
        <thead>
          <tr className="drive-list-head">
            <th className="drive-list-col-name drive-list-head__cell">Name</th>
            <th className="drive-list-head__cell hidden sm:table-cell">Modified</th>
            <th className="drive-list-head__cell hidden lg:table-cell">Kind</th>
            <th className="drive-list-col-size drive-list-head__cell text-right hidden sm:table-cell">
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => {
            const isFolder = f.kind === "folder";
            const folderPath = isFolder ? driveFolderUiPath(f) : "";
            const isSelected = selectedIds.includes(f.id);
            const isActive = f.id === activeId;
            const dropZone = isFolder ? folderDropZoneProps(folderPath) : ({} as FolderDropZoneProps);
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
                onDragStart={dragHandlers.onDragStart}
                onDragEnd={dragHandlers.onDragEnd}
                className={cn(
                  "drive-list-row group cursor-default transition-colors",
                  isItemDragging(f.id) && "drive-list-row--dragging",
                  isFolder && dropZone.isDropTarget && "drive-list-row--drop-target",
                  isSelected && "drive-list-row--selected",
                  isActive && !isSelected && "drive-list-row--active",
                )}
              >
                <td
                  className="drive-list-col-name py-2 px-3 min-w-0"
                  {...(isFolder ? dropZone : {})}
                >
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
                    <span className="min-w-0 flex-1 truncate font-medium">{f.title}</span>
                    {starred[f.id] ? (
                      <Star className="size-3 shrink-0 drive-list-folder-icon" fill="currentColor" />
                    ) : null}
                    <div className="ml-auto shrink-0">
                      <DriveFileItemActions
                        labels={labels}
                        file={f}
                        isStarred={!!starred[f.id]}
                        inTrash={inTrash}
                        onDownload={onDownload}
                        onStar={() => onStar(f.id)}
                        onRename={() => onRename(f)}
                        onMove={() => onMove(f)}
                        onDelete={() => onTrash(f)}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3 hidden sm:table-cell tabular-nums drive-list-muted">
                  {f.date}
                </td>
                <td className="py-2 px-3 hidden lg:table-cell drive-list-muted">
                  {KIND_LABEL[f.kind]}
                </td>
                <td className="drive-list-col-size py-2 px-3 text-right tabular-nums drive-list-muted hidden sm:table-cell">
                  {f.size}
                </td>
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
  inTrash,
  onClose,
  onDownload,
  onStar,
  onRename,
  onMove,
  onDelete,
  mobile,
}: {
  labels: DriveUILabels;
  file: DriveFile;
  previewSrc?: string;
  isStarred: boolean;
  inTrash: boolean;
  onClose: () => void;
  onDownload: () => void;
  onStar: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  mobile?: boolean;
}) {
  const { show } = useAppToast();

  const actions = buildDriveFileActions(
    labels,
    { isStarred, inTrash, canDownload: file.kind !== "folder" },
    {
      onDownload: () => {
        onDownload();
        show("Download started", { icon: <Download className="size-4" /> });
      },
      onStar,
      onRename,
      onMove,
      onDelete,
    },
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DriveDetailActionBar actions={actions} onClose={onClose} mobile={mobile} />
      <div className="drive-detail-panel__scroll">
        <div className="drive-detail-panel__preview">
          <DriveMediaPreview
            file={file}
            previewSrc={previewSrc}
            mediaClassName="drive-detail-panel__preview-media"
            videoControls
          />
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
    </div>
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
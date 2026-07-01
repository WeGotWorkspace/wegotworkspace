import { useRef } from "react";
import { Check, Star, Download, Folder, HardDrive, Users } from "lucide-react";
import { Tag } from "@/tag/src/tag";
import { useAppToast } from "@/hooks/use-app-toast";
import type { DriveFile, FileKind } from "@/drive-core/src/drive-models";
import { kindIcon } from "@/drive-core/src/drive-icons";
import type { MenuItemProps } from "@/menu-item/src/menu-item";
import { cn } from "@/lib/utils";
import { DriveDetailActionBar } from "@/drive-core/src/drive-detail-action-bar";
import { buildDriveFileActions } from "@/drive-core/src/drive-file-action-builders";
import { DriveFileItemActionsMenu } from "@/drive-core/src/drive-file-actions";
import { DriveMediaPreview } from "@/drive-core/src/drive-media-preview";
import type { ActionBarAction } from "@/action-bar/src/action-bar";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import { driveFolderUiPath } from "@/drive-core/src/drive-item-path";
import { isSharedDriveApiPath } from "@/drive-core/src/drive-search-utils";
import "@/drive-core/src/drive-browser.css";

type DriveOfflineBadgeLabels = {
  offlineAvailable: string;
  offlinePendingSync: string;
};

function DriveLocationLabel({ file }: { file: DriveFile }) {
  if (!file.location) return <>—</>;
  const shared = isSharedDriveApiPath(file.apiPath);
  const Icon = shared ? Users : HardDrive;
  return (
    <span className="drive-location-label">
      <Icon className="drive-location-label__icon" aria-hidden />
      <span className="drive-location-label__text">{file.location}</span>
    </span>
  );
}

function DriveOfflineBadge({
  pinned,
  pending,
  labels,
}: {
  pinned: boolean;
  pending: boolean;
  labels?: DriveOfflineBadgeLabels;
}) {
  if (!pinned && !pending) return null;
  const label = pending
    ? (labels?.offlinePendingSync ?? "Pending sync")
    : (labels?.offlineAvailable ?? "Available offline");
  return (
    <span
      className={cn(
        "drive-offline-badge",
        pending && "drive-offline-badge--pending",
        pinned && !pending && "drive-offline-badge--pinned",
      )}
      aria-label={label}
      title={label}
    />
  );
}

function DriveSelectionCheckbox({
  isSelected,
  className,
}: {
  isSelected: boolean;
  selectionMode?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("drive-selection-checkbox-wrap", className)}>
      <span
        className={cn(
          "drive-selection-checkbox",
          isSelected && "drive-selection-checkbox--selected",
        )}
      >
        {isSelected ? (
          <Check className="drive-selection-checkbox__icon" strokeWidth={2.75} />
        ) : null}
      </span>
    </span>
  );
}

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
  searchActive: _searchActive = false,
  showLocationColumn = false,
  offlineUnavailableIds,
  offlinePinnedIds,
  offlinePendingSyncIds,
  extraFileActions,
  pinLoadingId,
  offlineBadgeLabels,
}: {
  items: DriveFile[];
  imagePreviewUrls: Record<string, string>;
  selectedIds: string[];
  starred: Record<string, boolean>;
  labels: DriveUILabels;
  searchActive?: boolean;
  /** Show each file's drive location as a subtitle under the tile title. */
  showLocationColumn?: boolean;
  /** Mute rows that cannot be opened offline. */
  offlineUnavailableIds?: ReadonlySet<string>;
  offlinePinnedIds?: ReadonlySet<string>;
  offlinePendingSyncIds?: ReadonlySet<string>;
  extraFileActions?: (file: DriveFile) => ActionBarAction[];
  pinLoadingId?: string | null;
  offlineBadgeLabels?: DriveOfflineBadgeLabels;
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
                selectionMode={selectionMode}
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
                selectionMode={selectionMode}
                isStarred={!!starred[f.id]}
                isDragging={isItemDragging(f.id)}
                isTouch={isTouch}
                showLocation={showLocationColumn}
                isOfflineUnavailable={offlineUnavailableIds?.has(f.id) ?? false}
                isOfflinePinned={offlinePinnedIds?.has(f.id) ?? false}
                isOfflinePendingSync={offlinePendingSyncIds?.has(f.id) ?? false}
                extraActions={extraFileActions?.(f)}
                actionsDisabled={pinLoadingId === f.apiPath}
                offlineBadgeLabels={offlineBadgeLabels}
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
      <h3 className="drive-item-label drive-browser-section-title">{title}</h3>
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
  selectionMode,
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
  selectionMode: boolean;
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
  // Tile root is non-interactive so the actions menu is not nested inside a
  // button (axe nested-interactive); the overlay button is the click target.
  return (
    <div
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
        selectionMode && "drive-folder-tile--selection-mode",
        isDragging && "drive-folder-tile--dragging",
        folderDropZone.isDropTarget && "drive-folder-tile--drop-target",
        isSelected && "drive-folder-tile--selected",
        !isSelected && !folderDropZone.isDropTarget && "drive-folder-tile--idle",
      )}
    >
      <DriveSelectionCheckbox
        isSelected={isSelected}
        selectionMode={selectionMode}
        className="drive-folder-tile__checkbox"
      />
      <button
        type="button"
        aria-label={file.title}
        className="drive-tile__hit"
        onClick={(e) => {
          if (lp.fired.current) return;
          onSelect(e);
        }}
        onDoubleClick={selectionMode ? undefined : onOpen}
        onTouchStart={lp.start}
        onTouchEnd={lp.cancel}
        onTouchMove={lp.cancel}
      />
      <Folder
        className="drive-folder-tile__icon size-5 shrink-0"
        fill="currentColor"
        fillOpacity={0.15}
      />
      <span className="drive-folder-tile__title">{file.title}</span>
      {isStarred ? <Star className="drive-folder-tile__star" fill="currentColor" /> : null}
      <DriveFileItemActions
        labels={labels}
        file={file}
        isStarred={isStarred}
        inTrash={inTrash}
        canOpen={!selectionMode}
        onOpen={onOpen}
        onDownload={onDownload}
        onStar={onStar}
        onRename={onRename}
        onMove={onMove}
        onDelete={onTrash}
      />
    </div>
  );
}

function FileTile({
  file,
  previewSrc,
  isSelected,
  selectionMode,
  isStarred,
  isDragging,
  isTouch,
  showLocation = false,
  isOfflineUnavailable = false,
  isOfflinePinned = false,
  isOfflinePendingSync = false,
  extraActions,
  actionsDisabled = false,
  offlineBadgeLabels,
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
  selectionMode: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isTouch: boolean;
  showLocation?: boolean;
  isOfflineUnavailable?: boolean;
  isOfflinePinned?: boolean;
  isOfflinePendingSync?: boolean;
  extraActions?: ActionBarAction[];
  actionsDisabled?: boolean;
  offlineBadgeLabels?: DriveOfflineBadgeLabels;
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
  // Same overlay pattern as FolderTile: keeps the actions menu out of the
  // interactive tile target (axe nested-interactive).
  return (
    <div
      onContextMenu={(e) => {
        if (!isTouch) {
          e.preventDefault();
          onLongPress();
        }
      }}
      draggable={!isTouch}
      onDragStart={itemDragHandlers.onDragStart}
      onDragEnd={itemDragHandlers.onDragEnd}
      className={cn(
        "group drive-file-tile",
        selectionMode && "drive-file-tile--selection-mode",
        isDragging && "drive-file-tile--dragging",
        isSelected && "drive-file-tile--selected",
        isOfflineUnavailable && "drive-file-tile--offline-unavailable",
      )}
    >
      <button
        type="button"
        aria-label={file.title}
        className="drive-tile__hit"
        onClick={(e) => {
          if (lp.fired.current) return;
          onSelect(e);
        }}
        onDoubleClick={selectionMode ? undefined : onOpen}
        onTouchStart={lp.start}
        onTouchEnd={lp.cancel}
        onTouchMove={lp.cancel}
      />
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
        <DriveSelectionCheckbox
          isSelected={isSelected}
          selectionMode={selectionMode}
          className="drive-file-tile__checkbox"
        />
        <span className="drive-file-tile__kind-icon shrink-0">{kindIcon[file.kind]}</span>
        <div className="drive-file-tile__text min-w-0 flex-1">
          <div className="drive-file-tile__title-row">
            <span className="drive-file-tile__title">{file.title}</span>
            <DriveOfflineBadge
              pinned={isOfflinePinned}
              pending={isOfflinePendingSync}
              labels={offlineBadgeLabels}
            />
          </div>
          {showLocation && file.location ? <DriveLocationLabel file={file} /> : null}
        </div>
        <DriveFileItemActions
          labels={labels}
          file={file}
          isStarred={isStarred}
          inTrash={inTrash}
          canOpen={!selectionMode}
          onOpen={onOpen}
          onDownload={onDownload}
          onStar={onStar}
          onRename={onRename}
          onMove={onMove}
          onDelete={onTrash}
          extraActions={extraActions}
          disabled={actionsDisabled}
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
  canOpen = true,
  onOpen,
  onDownload,
  onStar,
  onRename,
  onMove,
  onDelete,
  extraActions,
  disabled = false,
}: {
  labels: DriveUILabels;
  file: DriveFile;
  isStarred: boolean;
  inTrash: boolean;
  /** When false, hide Open (matches double-click disabled in selection mode). */
  canOpen?: boolean;
  onOpen?: () => void;
  onDownload: (file: DriveFile) => void;
  onStar: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete: () => void;
  extraActions?: ActionBarAction[];
  disabled?: boolean;
}) {
  const actions = buildDriveFileActions(
    labels,
    {
      isStarred,
      inTrash,
      isFolder: file.kind === "folder",
      canOpen,
      canDownload: file.kind !== "folder",
    },
    {
      onOpen,
      onDownload: () => onDownload(file),
      onStar,
      onRename,
      onMove,
      onDelete,
    },
  );
  const merged = extraActions?.length ? [...actions, ...extraActions] : actions;
  return <DriveFileItemActionsMenu actions={merged} disabled={disabled} />;
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
  selectionMode,
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
  searchActive = false,
  showLocationColumn = false,
  locationColumnLabel = "Location",
  showKindColumn = true,
  offlineUnavailableIds,
  offlinePinnedIds,
  offlinePendingSyncIds,
  extraFileActions,
  pinLoadingId,
  offlineBadgeLabels,
}: {
  items: DriveFile[];
  activeId: string | null;
  selectedIds: string[];
  starred: Record<string, boolean>;
  selectionMode: boolean;
  isTouch: boolean;
  labels: DriveUILabels;
  searchActive?: boolean;
  /** Show a Location column (between Name and Modified) for cross-drive listings. */
  showLocationColumn?: boolean;
  /** Header label for the optional Location column. */
  locationColumnLabel?: string;
  /** Show the "Kind" column. Defaults to `true`; Docs home hides it (all documents). */
  showKindColumn?: boolean;
  /** Mute rows that cannot be opened offline. */
  offlineUnavailableIds?: ReadonlySet<string>;
  offlinePinnedIds?: ReadonlySet<string>;
  offlinePendingSyncIds?: ReadonlySet<string>;
  extraFileActions?: (file: DriveFile) => ActionBarAction[];
  pinLoadingId?: string | null;
  offlineBadgeLabels?: DriveOfflineBadgeLabels;
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
            <th className="drive-list-col-name drive-list-head__cell">
              {searchActive ? labels.searchViewTitle : labels.listColumnName}
            </th>
            {showLocationColumn ? (
              <th className="drive-list-col-location drive-list-head__cell hidden sm:table-cell">
                {locationColumnLabel}
              </th>
            ) : null}
            <th className="drive-list-head__cell hidden sm:table-cell">Modified</th>
            {showKindColumn ? (
              <th className="drive-list-head__cell hidden lg:table-cell">Kind</th>
            ) : null}
            <th className="drive-list-col-size drive-list-head__cell drive-list-head__cell--align-end hidden sm:table-cell">
              Size
            </th>
            <th className="drive-list-col-actions drive-list-head__cell drive-list-head__cell--align-end">
              {labels.listColumnActions}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => {
            const isFolder = f.kind === "folder";
            const folderPath = isFolder ? driveFolderUiPath(f) : "";
            const isSelected = selectedIds.includes(f.id);
            const isActive = f.id === activeId;
            const isOfflineUnavailable = offlineUnavailableIds?.has(f.id) ?? false;
            const dropZone = isFolder
              ? folderDropZoneProps(folderPath)
              : ({} as FolderDropZoneProps);
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
                data-selection-mode={selectionMode ? "true" : "false"}
                onClick={(e) => onSelect(f.id, e)}
                onDoubleClick={selectionMode ? undefined : () => onOpen(f)}
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
                  isOfflineUnavailable && "drive-list-row--offline-unavailable",
                )}
              >
                <td className="drive-list-col-name py-2 min-w-0" {...(isFolder ? dropZone : {})}>
                  <div className="drive-list-row__name flex items-center gap-2.5 min-w-0">
                    <DriveSelectionCheckbox
                      isSelected={isSelected}
                      selectionMode={selectionMode}
                      className="drive-list-row__checkbox"
                    />
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
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="min-w-0 truncate font-medium">{f.title}</span>
                      {starred[f.id] ? (
                        <Star
                          className="size-3 shrink-0 drive-list-folder-icon"
                          fill="currentColor"
                        />
                      ) : null}
                      <DriveOfflineBadge
                        pinned={offlinePinnedIds?.has(f.id) ?? false}
                        pending={offlinePendingSyncIds?.has(f.id) ?? false}
                        labels={offlineBadgeLabels}
                      />
                    </div>
                  </div>
                </td>
                {showLocationColumn ? (
                  <td className="drive-list-col-location py-2 hidden sm:table-cell drive-list-muted min-w-0">
                    <DriveLocationLabel file={f} />
                  </td>
                ) : null}
                <td className="py-2 hidden sm:table-cell tabular-nums drive-list-muted">
                  {f.date}
                </td>
                {showKindColumn ? (
                  <td className="py-2 hidden lg:table-cell drive-list-muted">
                    {KIND_LABEL[f.kind]}
                  </td>
                ) : null}
                <td className="drive-list-col-size py-2 text-right tabular-nums drive-list-muted hidden sm:table-cell">
                  {f.size}
                </td>
                <td
                  className="drive-list-col-actions py-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-end">
                    <DriveFileItemActions
                      labels={labels}
                      file={f}
                      isStarred={!!starred[f.id]}
                      inTrash={inTrash}
                      canOpen={!selectionMode}
                      onOpen={() => onOpen(f)}
                      onDownload={onDownload}
                      onStar={() => onStar(f.id)}
                      onRename={() => onRename(f)}
                      onMove={() => onMove(f)}
                      onDelete={() => onTrash(f)}
                      extraActions={extraFileActions?.(f)}
                      disabled={pinLoadingId === f.apiPath}
                    />
                  </div>
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
        <div className="drive-detail-panel__path">
          <Tag label={file.parent} icon={<HardDrive className="size-3.5 opacity-70" />} />
        </div>
        <h1 className="drive-detail-panel__title">{file.title}</h1>
        <dl className="space-y-2 text-sm mb-6">
          <Row label="Type" value={file.kind} />
          <Row label="Size" value={file.size} />
          <Row label="Modified" value={file.date} />
        </dl>
        {file.body.map((p, i) => (
          <p key={i} className="drive-detail-panel__body">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="drive-detail-panel__meta-row">
      <dt className="drive-detail-panel__meta-label">{label}</dt>
      <dd className="drive-detail-panel__meta-value">{value}</dd>
    </div>
  );
}

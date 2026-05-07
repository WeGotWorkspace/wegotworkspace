import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export type WorkspaceActionButton = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
};

export type UseWorkspaceListControllerArgs<TItem> = {
  items: TItem[];
  setItems: Dispatch<SetStateAction<TItem[]>>;
  visibleIds: string[];
  activeId: string;
  setActiveId: (id: string) => void;
  initialId?: string;
  onPrimarySelect?: (id: string) => void;
  onNavigateToId?: (id: string) => void;
  onMutationError: () => void;
  queueDelayMs?: number;
};

export type WorkspaceListControllerResult<TItem> = {
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  selectionMode: boolean;
  setSelectionMode: Dispatch<SetStateAction<boolean>>;
  handleSelect: (id: string, e: ReactMouseEvent) => void;
  enterSelectionFor: (id: string) => void;
  exitSelection: (activeId?: string) => void;
  selectSingle: (id: string) => void;
  isItemDragging: (id: string) => boolean;
  itemDragHandlers: (id: string) => Record<string, unknown>;
  sidebarDropZoneProps: (
    targetKey: string,
    onCommit: (ids: string[]) => void,
  ) => Record<string, unknown>;
  beginOptimisticUpdate: ({
    ids,
    updater,
  }: {
    ids: string[];
    updater: (item: TItem) => TItem;
  }) => {
    snapshotById: Map<string, TItem>;
    affectedItems: TItem[];
    rollback: () => void;
  };
  queueMutation: (args: {
    key: string;
    toastMessage: string;
    execute: (signal: AbortSignal) => Promise<void>;
    undo: () => void;
    onError?: () => void;
    undoToastMessage?: string;
  }) => void;
  undoLatest: () => boolean;
  navigateListByKeyboard: (direction: -1 | 1, extendSelection: boolean) => void;
};


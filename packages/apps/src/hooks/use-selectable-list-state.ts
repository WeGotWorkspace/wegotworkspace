import { useState } from "react";

type UseSelectableListStateOptions = {
  initialId?: string;
  visibleIds: string[];
  onPrimarySelect?: (id: string) => void;
};

export function useSelectableListState({
  initialId,
  visibleIds,
  onPrimarySelect,
}: UseSelectableListStateOptions) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialId ? [initialId] : []);
  const [lastClickedId, setLastClickedId] = useState<string>(initialId ?? "");
  const [selectionMode, setSelectionMode] = useState(false);

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (selectionMode) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      setLastClickedId(id);
      return;
    }

    if (e.shiftKey) {
      const a = visibleIds.indexOf(lastClickedId);
      const b = visibleIds.indexOf(id);
      if (a === -1 || b === -1) {
        setSelectedIds([id]);
      } else {
        const [start, end] = a < b ? [a, b] : [b, a];
        setSelectedIds(visibleIds.slice(start, end + 1));
      }
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      setLastClickedId(id);
      return;
    }

    setSelectedIds([id]);
    setLastClickedId(id);
    onPrimarySelect?.(id);
  };

  const enterSelectionFor = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const exitSelection = (activeId?: string) => {
    setSelectionMode(false);
    setSelectedIds(activeId ? [activeId] : []);
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const selectSingle = (id: string) => {
    setSelectedIds([id]);
    setLastClickedId(id);
  };

  return {
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    clearSelection,
    selectSingle,
  };
}

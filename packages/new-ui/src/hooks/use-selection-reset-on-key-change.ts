import { useEffect, type Dispatch, type SetStateAction } from "react";

type UseSelectionResetOnKeyChangeArgs = {
  resetKey: string;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setSelectionMode: Dispatch<SetStateAction<boolean>>;
};

export function useSelectionResetOnKeyChange({
  resetKey,
  setSelectedIds,
  setSelectionMode,
}: UseSelectionResetOnKeyChangeArgs) {
  useEffect(() => {
    setSelectedIds([]);
    setSelectionMode(false);
  }, [resetKey, setSelectedIds, setSelectionMode]);
}

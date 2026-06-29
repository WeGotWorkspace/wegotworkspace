import { useEffect, useState } from "react";
import type * as Y from "yjs";
import {
  getDocsSuggestionThreadsMap,
  readDocsSuggestionThreadsFromMap,
} from "./docs-suggestions-map";
import type { DocsSuggestionThread } from "./docs-suggestions-types";

export function useDocsSuggestionsSync(ydoc: Y.Doc | null): DocsSuggestionThread[] {
  const [threads, setThreads] = useState<DocsSuggestionThread[]>([]);

  useEffect(() => {
    if (!ydoc) {
      setThreads([]);
      return;
    }

    const map = getDocsSuggestionThreadsMap(ydoc);
    const sync = () => setThreads(readDocsSuggestionThreadsFromMap(map));
    map.observeDeep(sync);
    sync();
    return () => map.unobserveDeep(sync);
  }, [ydoc]);

  return threads;
}

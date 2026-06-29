import type { ChangeAuthor, TrackChangesMode, TrackChangesStorage } from "tiptap-track-changes";
import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    trackChanges: {
      setSuggestMode: () => ReturnType;
      setEditMode: () => ReturnType;
      setViewMode: () => ReturnType;
      setTrackChangesMode: (mode: TrackChangesMode) => ReturnType;
      setTrackChangesAuthor: (author: ChangeAuthor) => ReturnType;
      acceptChange: (changeId: string) => ReturnType;
      rejectChange: (changeId: string) => ReturnType;
      acceptAll: () => ReturnType;
      rejectAll: () => ReturnType;
    };
  }

  interface Storage {
    trackChanges: TrackChangesStorage;
  }
}

export {};

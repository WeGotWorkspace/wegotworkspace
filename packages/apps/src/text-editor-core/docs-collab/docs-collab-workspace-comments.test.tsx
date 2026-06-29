import { act, renderHook } from "@testing-library/react";
import { useCallback, useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { CommentMark } from "@/text-editor-core/src/text-editor-comment-commands";
import {
  shouldAutoOpenCommentsForDraft,
  shouldAutoOpenCommentsForThreads,
} from "./use-docs-comments-layout";
import { useDocsComments } from "./use-docs-comments";

function createEditor(content = "<p>Hello world</p>") {
  const editor = new Editor({
    extensions: [StarterKit.configure({ undoRedo: false }), CommentMark],
    content,
  });
  editor.commands.setTextSelection({ from: 7, to: 12 });
  return editor;
}

type ExplicitDraftComposeOptions = {
  ydoc: Y.Doc;
  editor: Editor;
  initialCommentsOpen?: boolean;
};

/** Mirrors explicit comment compose orchestration in docs-collab-workspace.tsx */
function useExplicitDraftCompose({
  ydoc,
  editor,
  initialCommentsOpen = false,
}: ExplicitDraftComposeOptions) {
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);

  const comments = useDocsComments({
    ydoc,
    editor,
    currentUser: { id: "u-1", name: "Alex" },
    commentsVisible: commentsOpen,
  });

  const {
    draftThread,
    selectionQualifiesForComment,
    openThreads,
    createThreadFromSelection,
    selectThread,
  } = comments;

  const addCommentFromSelection = useCallback(() => {
    setCommentsOpen(true);
    if (draftThread) {
      selectThread(draftThread.id);
      return;
    }
    if (selectionQualifiesForComment) {
      createThreadFromSelection();
    }
  }, [createThreadFromSelection, draftThread, selectThread, selectionQualifiesForComment]);

  useEffect(() => {
    if (shouldAutoOpenCommentsForDraft(draftThread)) {
      setCommentsOpen(true);
      return;
    }
    if (!shouldAutoOpenCommentsForThreads("margin-compact")) return;
    if (openThreads.length > 0) {
      setCommentsOpen(true);
    }
  }, [draftThread, openThreads.length]);

  return {
    commentsOpen,
    draftThread,
    selectionQualifiesForComment,
    addCommentFromSelection,
  };
}

/** Mirrors source/comments exclusivity in docs-collab-workspace.tsx */
function useSourceCommentsExclusivity({
  initialViewSource = false,
  initialCommentsOpen = false,
  initialDraftThread = null as ReturnType<typeof useDocsComments>["draftThread"],
} = {}) {
  const [viewSource, setViewSource] = useState(initialViewSource);
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);
  const [draftThread, setDraftThread] = useState(initialDraftThread);

  const handleCommentsClose = useCallback(() => {
    setCommentsOpen(false);
    setDraftThread(null);
  }, []);

  useEffect(() => {
    if (!viewSource) return;
    if (commentsOpen || draftThread) {
      handleCommentsClose();
    }
  }, [commentsOpen, draftThread, handleCommentsClose, viewSource]);

  const handleToggleComments = useCallback(() => {
    if (viewSource) return;
    if (commentsOpen) {
      handleCommentsClose();
      return;
    }
    setCommentsOpen(true);
  }, [commentsOpen, handleCommentsClose, viewSource]);

  const handleToggleSource = useCallback(() => {
    if (commentsOpen) return;
    setViewSource((on) => !on);
  }, [commentsOpen]);

  return {
    viewSource,
    commentsOpen,
    draftThread,
    commentsDisabled: viewSource,
    sourceDisabled: commentsOpen,
    handleToggleComments,
    handleToggleSource,
    setViewSource,
    setCommentsOpen,
    setDraftThread,
  };
}

describe("docs-collab-workspace source/comments exclusivity", () => {
  it("closes comments when source view is enabled", () => {
    const { result } = renderHook(() =>
      useSourceCommentsExclusivity({
        initialCommentsOpen: true,
      }),
    );

    expect(result.current.commentsOpen).toBe(true);
    expect(result.current.sourceDisabled).toBe(true);

    act(() => {
      result.current.setCommentsOpen(false);
    });
    expect(result.current.sourceDisabled).toBe(false);

    act(() => {
      result.current.setViewSource(true);
    });

    expect(result.current.viewSource).toBe(true);
    expect(result.current.commentsOpen).toBe(false);
    expect(result.current.commentsDisabled).toBe(true);
  });

  it("does not open comments from the toggle while source view is active", () => {
    const { result } = renderHook(() =>
      useSourceCommentsExclusivity({
        initialViewSource: true,
      }),
    );

    expect(result.current.commentsDisabled).toBe(true);

    act(() => {
      result.current.handleToggleComments();
    });

    expect(result.current.commentsOpen).toBe(false);
  });

  it("does not enable source while comments are open", () => {
    const { result } = renderHook(() =>
      useSourceCommentsExclusivity({
        initialCommentsOpen: true,
      }),
    );

    expect(result.current.sourceDisabled).toBe(true);

    act(() => {
      result.current.handleToggleSource();
    });

    expect(result.current.viewSource).toBe(false);
  });

  it("closes comments when source is enabled while a draft exists", () => {
    const { result } = renderHook(() =>
      useSourceCommentsExclusivity({
        initialCommentsOpen: true,
        initialDraftThread: { id: "draft-1" } as ReturnType<typeof useDocsComments>["draftThread"],
      }),
    );

    act(() => {
      result.current.setCommentsOpen(false);
      result.current.setViewSource(true);
    });

    expect(result.current.viewSource).toBe(true);
    expect(result.current.commentsOpen).toBe(false);
    expect(result.current.draftThread).toBeNull();
  });
});

describe("docs-collab-workspace draft compose", () => {
  it("does not create a draft when text is selected without clicking Comment", () => {
    const ydoc = new Y.Doc();
    const editor = createEditor();

    const { result } = renderHook(() =>
      useExplicitDraftCompose({
        ydoc,
        editor,
        initialCommentsOpen: false,
      }),
    );

    expect(result.current.selectionQualifiesForComment).toBe(true);
    expect(result.current.draftThread).toBeNull();
    expect(result.current.commentsOpen).toBe(false);

    act(() => {
      editor.destroy();
    });
  });

  it("creates a draft and opens comments when Comment is clicked (drawer tier)", () => {
    const ydoc = new Y.Doc();
    const editor = createEditor();

    const { result } = renderHook(() =>
      useExplicitDraftCompose({
        ydoc,
        editor,
        initialCommentsOpen: false,
      }),
    );

    act(() => {
      result.current.addCommentFromSelection();
    });

    expect(result.current.draftThread).not.toBeNull();
    expect(result.current.commentsOpen).toBe(true);

    act(() => {
      editor.destroy();
    });
  });

  it("opens comments and focuses an existing draft when Comment is clicked again", () => {
    const ydoc = new Y.Doc();
    const editor = createEditor();

    const { result } = renderHook(() =>
      useExplicitDraftCompose({
        ydoc,
        editor,
        initialCommentsOpen: false,
      }),
    );

    act(() => {
      result.current.addCommentFromSelection();
    });

    const draftId = result.current.draftThread?.id;
    expect(draftId).toBeTruthy();

    act(() => {
      result.current.addCommentFromSelection();
    });

    expect(result.current.draftThread?.id).toBe(draftId);
    expect(result.current.commentsOpen).toBe(true);

    act(() => {
      editor.destroy();
    });
  });
});

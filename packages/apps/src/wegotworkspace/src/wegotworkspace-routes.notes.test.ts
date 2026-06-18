import { createMemoryHistory } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { createWeGotWorkspaceRouter } from "@/wegotworkspace/src/wegotworkspace-routes";

describe("wegotworkspace notes routes", () => {
  it("matches noteId on direct /notes/all/:noteId loads", async () => {
    const history = createMemoryHistory({
      initialEntries: ["/notes/all/n-123"],
    });
    const router = createWeGotWorkspaceRouter({ mode: "mock", history });
    await router.load();

    const noteMatch = router.state.matches.find((match) => match.params.noteId);
    expect(noteMatch?.params).toMatchObject({ noteId: "n-123" });
  });

  it("matches archive and notebook params on deep links", async () => {
    const archiveHistory = createMemoryHistory({
      initialEntries: ["/notes/archive/n-456"],
    });
    const archiveRouter = createWeGotWorkspaceRouter({ mode: "mock", history: archiveHistory });
    await archiveRouter.load();

    const archiveMatch = archiveRouter.state.matches.find((match) =>
      match.pathname.includes("/archive"),
    );
    expect(archiveMatch?.params).toMatchObject({ noteId: "n-456" });

    const notebookHistory = createMemoryHistory({
      initialEntries: ["/notes/Drafts/n-789"],
    });
    const notebookRouter = createWeGotWorkspaceRouter({ mode: "mock", history: notebookHistory });
    await notebookRouter.load();

    const notebookMatch = notebookRouter.state.matches.find((match) => match.params.notebookSlug);
    expect(notebookMatch?.params).toMatchObject({
      notebookSlug: "Drafts",
      noteId: "n-789",
    });
  });
});

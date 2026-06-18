import { expect, test } from "@playwright/test";
import {
  appendToActiveNoteBody,
  archiveNoteTokenOnServer,
  seedNoteWithToken,
  deleteFilteredArchivedNotes,
  expectOfflineIndicator,
  expectPendingDotVisible,
  expectSyncCompleted,
  noteTokenOnServer,
  openArchiveView,
  openFirstNote,
  prepareNotesForOfflineSync,
  restoreNetwork,
  blockReachabilityAndApi,
  reloadNotesOffline,
} from "./helpers/notes-live";

test.describe("Notes offline sync (live app)", () => {
  test("network offline: edit, reconnect, pending dot clears and sync toast shows", async ({
    page,
  }) => {
    const token = `e2e-net-${Date.now()}`;

    await prepareNotesForOfflineSync(page);
    await openFirstNote(page);

    await page.context().setOffline(true);
    await expectOfflineIndicator(page);

    await appendToActiveNoteBody(page, token);
    await expectPendingDotVisible(page);

    await page.context().setOffline(false);
    await expectSyncCompleted(page);
    await expect(page.locator(".ProseMirror")).toContainText(token);
  });

  test("stale navigator.onLine: blocked API/probe then restore triggers sync", async ({ page }) => {
    const token = `e2e-stale-${Date.now()}`;

    await prepareNotesForOfflineSync(page);
    await blockReachabilityAndApi(page);
    await reloadNotesOffline(page);
    await expectOfflineIndicator(page);

    await openFirstNote(page);
    await appendToActiveNoteBody(page, token);
    await expectPendingDotVisible(page);

    await restoreNetwork(page);
    await expectSyncCompleted(page);
    await expect(page.locator(".ProseMirror")).toContainText(token);
  });

  test("two windows: editor syncs and observer sees edit without reload", async ({ browser }) => {
    const token = `e2e-2win-${Date.now()}`;
    const authFile = "e2e/.auth/admin.json";
    // Same browser context so BroadcastChannel / IDB match real multi-tab behavior.
    const context = await browser.newContext({ storageState: authFile });
    const editor = await context.newPage();
    const observer = await context.newPage();

    try {
      await prepareNotesForOfflineSync(editor);
      await prepareNotesForOfflineSync(observer);
      await openFirstNote(editor);
      await openFirstNote(observer);

      await editor.context().setOffline(true);
      await expectOfflineIndicator(editor);

      await appendToActiveNoteBody(editor, token);
      await expectPendingDotVisible(editor);
      await expect(observer.getByText(token)).toHaveCount(0);

      const serverSync = editor.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/notes/items") &&
          response.request().method() !== "GET" &&
          response.ok(),
        { timeout: 30_000 },
      );
      await editor.context().setOffline(false);
      await expectSyncCompleted(editor);
      await serverSync;

      await expect
        .poll(
          async () =>
            editor.evaluate(async (expected) => {
              const accessToken = localStorage.getItem("wgw.api.access_token");
              const response = await fetch("/api/v1/notes/items", {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (!response.ok) return false;
              const json = (await response.json()) as { items?: { body?: string }[] };
              return json.items?.some((item) => item.body?.includes(expected)) ?? false;
            }, token),
          { timeout: 20_000 },
        )
        .toBe(true);

      await expect
        .poll(
          async () =>
            observer.evaluate(
              (expected) => document.body.textContent?.includes(expected) ?? false,
              token,
            ),
          { timeout: 30_000 },
        )
        .toBe(true);
    } finally {
      await context.close();
    }
  });

  test("online delete: permanent delete syncs to server", async ({ page }) => {
    const token = `e2e-del-${Date.now()}`;

    await prepareNotesForOfflineSync(page);
    await seedNoteWithToken(page, token);
    await archiveNoteTokenOnServer(page, token);
    await deleteFilteredArchivedNotes(page, token);

    await expect.poll(() => noteTokenOnServer(page, token), { timeout: 20_000 }).toBe(false);
    await expect(page.getByText(token)).toHaveCount(0);
  });

  test("offline delete: queues delete and syncs after reconnect", async ({ page }) => {
    const token = `e2e-del-off-${Date.now()}`;

    await prepareNotesForOfflineSync(page);
    await seedNoteWithToken(page, token);
    await archiveNoteTokenOnServer(page, token);
    await openArchiveView(page, token);

    await page.context().setOffline(true);
    await expectOfflineIndicator(page);

    await page.getByRole("button", { name: "Empty archive" }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(token)).toHaveCount(0);

    await page.context().setOffline(false);
    await expectSyncCompleted(page);

    await expect.poll(() => noteTokenOnServer(page, token), { timeout: 45_000 }).toBe(false);
  });
});

import { expect, test } from "@playwright/test";
import {
  docsHomeRow,
  docsUrlForFile,
  gotoDocsHome,
  loginToDocs,
  myDriveDocSearchPath,
  seedDocAtPath,
} from "./helpers/docs-live";

test.describe("Docs home browse (live app)", () => {
  test("uploaded My Drive .md appears in home list and opens in the editor", async ({ page }) => {
    const stamp = Date.now();
    const fileName = `e2e-home-${stamp}.md`;
    const searchPath = myDriveDocSearchPath(fileName);
    const apiPath = `/${searchPath}`;

    // Authenticate (storageState) and land on the Docs home view.
    await loginToDocs(page);

    // Seed a fresh Markdown file in My Drive; the upload indexes synchronously,
    // so browse mode should surface it on the next home fetch.
    await seedDocAtPath(page, apiPath, `# ${fileName}\n\nE2E docs home browse seed.\n`);

    // Re-fetch the home list now that the file is indexed.
    await gotoDocsHome(page);

    const row = docsHomeRow(page, fileName);
    await expect(row).toBeVisible({ timeout: 30_000 });

    // Location column reflects the top-level drive for a My Drive file.
    await expect(row.locator(".drive-list-col-location")).toHaveText("My Drive");

    // Opening the row navigates to the editor for that file.
    await row.click();

    await expect(page).toHaveURL(/[?&]file=/, { timeout: 30_000 });
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(searchPath)));
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".ProseMirror")).toContainText(fileName);

    // Sanity: the direct deep link to the same file also resolves to the editor.
    await page.goto(docsUrlForFile(apiPath));
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WORKSPACE_APP_ACCENT,
  WORKSPACE_APP_IDS,
  WORKSPACE_HOME_ACCENT,
} from "@/lib/workspace-app-icons";

const manifestsDir = join(import.meta.dirname, "../../public/manifests");

type WorkspaceManifest = {
  start_url: string;
  scope: string;
  theme_color?: string;
  background_color?: string;
};

function readManifest(name: string): WorkspaceManifest {
  return JSON.parse(
    readFileSync(join(manifestsDir, `${name}.webmanifest`), "utf8"),
  ) as WorkspaceManifest;
}

describe("workspace PWA manifests", () => {
  it("uses canonical list landing paths for multi-segment apps", () => {
    expect(readManifest("notes")).toMatchObject({
      start_url: "/notes/all",
      scope: "/notes",
    });
    expect(readManifest("contacts")).toMatchObject({
      start_url: "/contacts/all",
      scope: "/contacts",
    });
    expect(readManifest("tasks")).toMatchObject({
      start_url: "/tasks/lists/inbox",
      scope: "/tasks",
    });
  });

  it("keeps theme_color and background_color in sync with WORKSPACE_APP_ACCENT", () => {
    for (const appId of WORKSPACE_APP_IDS) {
      const manifest = readManifest(appId);
      const accent = WORKSPACE_APP_ACCENT[appId].toLowerCase();

      expect(manifest.theme_color?.toLowerCase()).toBe(accent);
      expect(manifest.background_color?.toLowerCase()).toBe(accent);
    }
  });

  it("uses the home shell accent for home.webmanifest", () => {
    const manifest = readManifest("home");
    const accent = WORKSPACE_HOME_ACCENT.toLowerCase();

    expect(manifest.theme_color?.toLowerCase()).toBe(accent);
    expect(manifest.background_color?.toLowerCase()).toBe(accent);
  });
});

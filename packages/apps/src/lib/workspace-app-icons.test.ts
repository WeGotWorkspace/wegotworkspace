import { describe, expect, it } from "vitest";
import {
  WORKSPACE_APP_ACCENT,
  WORKSPACE_APP_IDS,
  workspaceAppIconAppleTouchSrc,
  workspaceAppIconManifestSrc,
  workspaceAppIconUiSrc,
} from "@/lib/workspace-app-icons";
import { WORKSPACE_APP_ICON_INLINE } from "@/lib/workspace-app-icon-svgs";

describe("workspaceAppIconUiSrc", () => {
  it("points at canonical vector artwork under /app-icons/", () => {
    expect(workspaceAppIconUiSrc("mail")).toBe("/app-icons/mail.svg");
  });
});

describe("WORKSPACE_APP_ICON_INLINE", () => {
  it("bundles inline SVG markup for every workspace app", () => {
    for (const appId of WORKSPACE_APP_IDS) {
      expect(WORKSPACE_APP_ICON_INLINE[appId]).toMatch(/^<svg[\s>]/);
      expect(WORKSPACE_APP_ICON_INLINE[appId]).toContain("--wai-bg");
    }
  });

  it("maps each app to distinct artwork (no cross-app SVG reuse)", () => {
    const pathSets = WORKSPACE_APP_IDS.map(
      (appId) =>
        [
          appId,
          [...WORKSPACE_APP_ICON_INLINE[appId].matchAll(/d="([^"]+)"/g)].map((m) => m[1]),
        ] as const,
    );

    for (let i = 0; i < pathSets.length; i++) {
      for (let j = i + 1; j < pathSets.length; j++) {
        const [appA, pathsA] = pathSets[i];
        const [appB, pathsB] = pathSets[j];
        expect(JSON.stringify(pathsA)).not.toBe(JSON.stringify(pathsB));
        expect(`${appA} vs ${appB}`).toBeTruthy();
      }
    }
  });

  it("keeps notes as notepad lines, not the contacts person silhouette", () => {
    const notes = WORKSPACE_APP_ICON_INLINE.notes;
    const contacts = WORKSPACE_APP_ICON_INLINE.contacts;

    expect(notes).toContain('d="M337 208H175');
    expect(notes).not.toContain('d="M256 280C284.719');
    expect(contacts).toContain('d="M256 280C284.719');
    expect(contacts).not.toContain('d="M337 208H175');
  });
});

describe("workspaceAppIconUiSrc mapping", () => {
  it("resolves one canonical SVG per workspace app id", () => {
    for (const appId of WORKSPACE_APP_IDS) {
      expect(workspaceAppIconUiSrc(appId)).toBe(`/app-icons/${appId}.svg`);
    }
  });
});

describe("workspaceAppIconManifestSrc", () => {
  it("points at vector SVG for web app manifests", () => {
    expect(workspaceAppIconManifestSrc("mail")).toBe("/app-icons/mail.svg");
  });
});

describe("workspaceAppIconAppleTouchSrc", () => {
  it("points at 180px PNG for iOS apple-touch-icon only", () => {
    expect(workspaceAppIconAppleTouchSrc("mail")).toBe("/pwa-icons/mail-180.png");
  });
});

describe("WORKSPACE_APP_ACCENT", () => {
  it("defines an accent for every workspace app", () => {
    for (const appId of WORKSPACE_APP_IDS) {
      expect(WORKSPACE_APP_ACCENT[appId]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  WORKSPACE_APP_ACCENT,
  WORKSPACE_APP_IDS,
  workspaceAppIconGlyphMaskSrc,
  workspaceAppIconSrc,
  workspaceAppIconSwitchTriggerStyle,
  workspaceAppIconUiSrc,
} from "@/lib/workspace-app-icons";

describe("workspaceAppIconUiSrc", () => {
  it("points at canonical user artwork under /app-icons/", () => {
    expect(workspaceAppIconUiSrc("mail")).toBe("/app-icons/mail.png");
  });
});

describe("workspaceAppIconGlyphMaskSrc", () => {
  it("points at build-time glyph masks under /app-icons/", () => {
    expect(workspaceAppIconGlyphMaskSrc("drive")).toBe("/app-icons/drive-glyph.png");
  });
});

describe("workspaceAppIconSwitchTriggerStyle", () => {
  it("sets accent fg and glyph mask url for switch trigger inversion", () => {
    expect(workspaceAppIconSwitchTriggerStyle("drive")).toEqual({
      "--app-switch-icon-fg": WORKSPACE_APP_ACCENT.drive,
      "--workspace-app-icon-glyph-mask": "url(/app-icons/drive-glyph.png)",
    });
  });
});

describe("workspaceAppIconSrc", () => {
  it("points at rasterized PWA sizes under /pwa-icons/", () => {
    expect(workspaceAppIconSrc("mail", 512)).toBe("/pwa-icons/mail-512.png");
    expect(workspaceAppIconSrc("mail")).toBe("/pwa-icons/mail-192.png");
  });
});

describe("WORKSPACE_APP_ACCENT", () => {
  it("defines an accent for every workspace app", () => {
    for (const appId of WORKSPACE_APP_IDS) {
      expect(WORKSPACE_APP_ACCENT[appId]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

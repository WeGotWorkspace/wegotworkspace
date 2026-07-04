/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_OFFLINE_DEVICE_CONTENT_SETTINGS,
  isEligibleForAutoContentSync,
  readOfflineDeviceContentSettings,
  writeOfflineDeviceContentSettings,
} from "@/lib/offline/core/offline-device-settings";

describe("offline-device-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when unset", () => {
    expect(readOfflineDeviceContentSettings()).toEqual(DEFAULT_OFFLINE_DEVICE_CONTENT_SETTINGS);
  });

  it("persists content sync toggle and max size", () => {
    writeOfflineDeviceContentSettings({
      contentSyncEnabled: false,
      maxFileSizeBytes: 4 * 1024 * 1024,
    });
    expect(readOfflineDeviceContentSettings()).toEqual({
      contentSyncEnabled: false,
      maxFileSizeBytes: 4 * 1024 * 1024,
    });
  });

  it("evaluates auto content eligibility", () => {
    const settings = { contentSyncEnabled: true, maxFileSizeBytes: 1024 };
    expect(isEligibleForAutoContentSync(512, settings)).toBe(true);
    expect(isEligibleForAutoContentSync(2048, settings)).toBe(false);
    expect(isEligibleForAutoContentSync(2048, { ...settings, contentSyncEnabled: false })).toBe(
      false,
    );
  });
});

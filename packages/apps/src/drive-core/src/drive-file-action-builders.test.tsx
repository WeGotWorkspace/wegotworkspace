import { describe, expect, it, vi } from "vitest";
import { buildDriveFileActions } from "@/drive-core/src/drive-file-action-builders";
import { driveLabels } from "@/drive-core/src/drive-labels";

describe("buildDriveFileActions", () => {
  it("includes Open as the first action when onOpen is provided", () => {
    const onOpen = vi.fn();
    const actions = buildDriveFileActions(
      driveLabels,
      { isStarred: false, inTrash: false, canOpen: true },
      {
        onOpen,
        onDownload: vi.fn(),
        onStar: vi.fn(),
        onDelete: vi.fn(),
      },
    );

    expect(actions[0]?.id).toBe("open");
    expect(actions[0]?.label).toBe(driveLabels.detailOpen);
    actions[0]?.onClick?.();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("omits Open when canOpen is false", () => {
    const actions = buildDriveFileActions(
      driveLabels,
      { isStarred: false, inTrash: false, canOpen: false },
      {
        onOpen: vi.fn(),
        onDownload: vi.fn(),
        onStar: vi.fn(),
        onDelete: vi.fn(),
      },
    );

    expect(actions.some((action) => action.id === "open")).toBe(false);
  });
});

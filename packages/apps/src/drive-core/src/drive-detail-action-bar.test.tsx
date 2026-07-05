import { render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/ui/tooltip";
import { DriveDetailActionBar } from "./drive-detail-action-bar";
import { buildDriveFileActions } from "./drive-file-action-builders";
import { driveLabels } from "./drive-labels";

function renderActionBar(mobile?: boolean) {
  const actions = buildDriveFileActions(
    driveLabels,
    { isStarred: false, inTrash: false, canDownload: true },
    {
      onDownload: vi.fn(),
      onStar: vi.fn(),
      onRename: vi.fn(),
      onMove: vi.fn(),
      onDelete: vi.fn(),
    },
  );

  return render(
    <TooltipProvider>
      <div className="drive-workspace">
        <DriveDetailActionBar actions={actions} onClose={vi.fn()} mobile={mobile} />
      </div>
    </TooltipProvider>,
  );
}

describe("DriveDetailActionBar", () => {
  it("keeps inline actions on desktop aside", () => {
    const { container } = renderActionBar();
    const bar = container.querySelector(".action-bar");
    expect(bar?.classList.contains("action-bar--expanded")).toBe(true);

    const row = container.querySelector(".action-bar__row");
    expect(row).toBeTruthy();
    expect(
      within(row as HTMLElement).getByRole("button", { name: driveLabels.detailDownload }),
    ).toBeTruthy();
  });

  it("enables compact overflow on mobile stacked detail", () => {
    const { container } = renderActionBar(true);
    const bar = container.querySelector(".action-bar");
    expect(bar?.classList.contains("action-bar--expanded")).toBe(false);
    expect(container.querySelector(".action-bar__menu")).toBeTruthy();
    expect(within(container as HTMLElement).getByRole("button", { name: "Back" })).toBeTruthy();
  });
});

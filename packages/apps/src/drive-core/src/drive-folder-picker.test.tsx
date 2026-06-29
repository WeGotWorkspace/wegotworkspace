import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DriveFolderPicker } from "@/drive-core/src/drive-folder-picker";
import { driveLabels } from "@/drive-core/src/drive-labels";
import type { DriveFile } from "@/drive-core/src/drive-models";
import "@/drive-core/src/drive-folder-picker.css";

afterEach(() => {
  cleanup();
});

describe("DriveFolderPicker", () => {
  it("keeps browse path after double-click when the files prop gets a new reference", () => {
    const onDestinationChange = vi.fn();
    const files: DriveFile[] = [];
    const props = {
      labels: driveLabels,
      files,
      groupPaths: [] as string[],
      moveIds: [] as string[],
      initialBrowsePath: "My Drive",
      currentUsername: "alice",
      groupRootNames: new Set<string>(),
      onDestinationChange,
    };

    const view = render(<DriveFolderPicker {...props} />);

    fireEvent.doubleClick(screen.getByText("Studio Assets"));
    expect(screen.getByText("studio-mark-final.svg")).toBeTruthy();

    view.rerender(<DriveFolderPicker {...props} files={[...files]} />);

    expect(screen.getByText("studio-mark-final.svg")).toBeTruthy();
    expect(screen.queryByText("Archives")).toBeNull();
  });
});

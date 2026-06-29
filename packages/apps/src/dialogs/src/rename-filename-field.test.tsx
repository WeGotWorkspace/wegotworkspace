// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RenameFilenameField } from "@/dialogs/src/rename-filename-field";

describe("RenameFilenameField", () => {
  it("selects the default name when focusKey becomes active", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    const select = vi.fn();
    const focus = vi.fn();
    vi.spyOn(HTMLInputElement.prototype, "select").mockImplementation(select);
    vi.spyOn(HTMLInputElement.prototype, "focus").mockImplementation(focus);

    const { rerender } = render(
      <RenameFilenameField baseName="Untitled" onBaseNameChange={() => {}} extension=".md" />,
    );

    rerender(
      <RenameFilenameField
        baseName="Untitled 2"
        onBaseNameChange={() => {}}
        extension=".md"
        focusKey="Untitled 2.md"
      />,
    );

    expect(focus).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
  });
});

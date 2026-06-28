import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SideDrawer } from "@/ui/side-drawer";

import "@/ui/side-drawer.css";

afterEach(() => {
  cleanup();
});

describe("SideDrawer", () => {
  it("renders children when open", () => {
    render(
      <SideDrawer open onClose={vi.fn()} title="Comments">
        <p>Drawer body</p>
      </SideDrawer>,
    );

    expect(screen.getByText("Drawer body")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Comments" })).toBeTruthy();
  });

  it("does not render children when closed", () => {
    render(
      <SideDrawer open={false} onClose={vi.fn()} title="Comments">
        <p>Drawer body</p>
      </SideDrawer>,
    );

    expect(screen.queryByText("Drawer body")).toBeNull();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <SideDrawer open onClose={onClose} title="Comments">
        <p>Drawer body</p>
      </SideDrawer>,
    );

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

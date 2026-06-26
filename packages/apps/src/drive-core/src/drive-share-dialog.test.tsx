import type { ReactElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/ui/tooltip";
import { DriveShareDialog } from "@/drive-core/src/drive-share-dialog";
import { createMockShareOperations, makeMockShare } from "@/drive-core/src/drive-share-fixtures";

afterEach(() => {
  cleanup();
});

const renderWithProviders = (ui: ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

const target = {
  path: "/users/demo.user/Project Brief.md",
  name: "Project Brief.md",
  targetType: "file" as const,
};

describe("DriveShareDialog", () => {
  it("creates a share link when none exists", async () => {
    const operations = createMockShareOperations();
    const createShare = vi.spyOn(operations, "createShare");

    renderWithProviders(
      <DriveShareDialog
        open
        onOpenChange={() => {}}
        target={target}
        operations={operations}
        origin="https://app.example.com"
      />,
    );

    const createButton = await screen.findByRole("button", { name: /create share link/i });
    fireEvent.click(createButton);

    await waitFor(() =>
      expect(createShare).toHaveBeenCalledWith({
        path: target.path,
        publicAccess: "none",
      }),
    );
    expect(await screen.findByText(/share link/i)).toBeTruthy();
  });

  it("invites recipients by email against an existing share", async () => {
    const operations = createMockShareOperations([
      makeMockShare({ path: target.path, name: target.name, publicAccess: "read" }),
    ]);
    const addShareGrants = vi.spyOn(operations, "addShareGrants");

    renderWithProviders(
      <DriveShareDialog open onOpenChange={() => {}} target={target} operations={operations} />,
    );

    const emailInput = await screen.findByPlaceholderText("name@example.com");
    fireEvent.change(emailInput, { target: { value: "guest@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));

    await waitFor(() =>
      expect(addShareGrants).toHaveBeenCalledWith({
        shareId: "shr_demo",
        emails: ["guest@example.com"],
        permission: "read",
      }),
    );
    expect(await screen.findByText("guest@example.com")).toBeTruthy();
  });

  it("shows an unavailable hint without operations", async () => {
    renderWithProviders(<DriveShareDialog open onOpenChange={() => {}} target={target} />);
    expect(await screen.findByText(/unavailable in this preview/i)).toBeTruthy();
  });
});

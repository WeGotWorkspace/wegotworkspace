import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstallWizardActions } from "@/install-core/src/install-wizard-actions";
import "@/install-core/src/install-workspace.css";

function renderActions(
  overrides: Partial<Parameters<typeof InstallWizardActions>[0]["controller"]> = {},
) {
  const controller = {
    step: { id: "admin" as const, label: "Account", icon: null },
    stepIdx: 5,
    goBack: vi.fn(),
    goNext: vi.fn(),
    canNext: true,
    actionPending: false,
    mysqlTest: { state: "testing" as const },
    setUiStep: vi.fn(),
    ...overrides,
  };

  render(<InstallWizardActions controller={controller} />);
  return controller;
}

describe("InstallWizardActions", () => {
  it("keeps Finish install enabled on admin when mysql connection test is still running", () => {
    renderActions();

    const button = screen.getByRole("button", { name: /finish install/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("disables Continue on database while mysql connection test is running", () => {
    renderActions({
      step: { id: "database", label: "Database", icon: null },
      stepIdx: 1,
    });

    const button = screen.getByRole("button", { name: /working/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});

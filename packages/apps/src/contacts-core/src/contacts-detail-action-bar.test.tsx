import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/ui/tooltip";
import { ContactsDetailActionBar } from "./contacts-detail-action-bar";
import { defaultContactsLabels } from "./contacts-labels";

function renderActionBar(props: Partial<ComponentProps<typeof ContactsDetailActionBar>> = {}) {
  return render(
    <TooltipProvider>
      <ContactsDetailActionBar
        labels={defaultContactsLabels}
        canEdit
        editMode={false}
        createMode={false}
        closeMobileDetail={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onDownload={() => {}}
        onSave={() => {}}
        onCancel={() => {}}
        {...props}
      />
    </TooltipProvider>,
  );
}

describe("ContactsDetailActionBar", () => {
  it("shows edit and delete actions in read mode", () => {
    renderActionBar();
    expect(screen.getByRole("button", { name: defaultContactsLabels.edit })).toBeTruthy();
    expect(screen.getByRole("button", { name: defaultContactsLabels.delete })).toBeTruthy();
  });

  it("hides save and cancel actions while editing an existing contact", () => {
    renderActionBar({ editMode: true });
    expect(screen.queryByRole("button", { name: defaultContactsLabels.save })).toBeNull();
    expect(screen.queryByRole("button", { name: defaultContactsLabels.cancel })).toBeNull();
  });

  it("shows save and cancel actions in create mode", () => {
    renderActionBar({ createMode: true, editMode: false });
    expect(screen.getByRole("button", { name: defaultContactsLabels.save })).toBeTruthy();
    expect(screen.getByRole("button", { name: defaultContactsLabels.cancel })).toBeTruthy();
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewHeader } from "@/view-header/src/view-header";

const baseProps = {
  title: "All Items",
  hideSidebarToggle: true,
};

describe("ViewHeader titleSize", () => {
  it("does not apply the small title modifier by default", () => {
    const { container } = render(<ViewHeader {...baseProps} />);
    const title = container.querySelector(".view-header__title");
    expect(title).not.toBeNull();
    expect(title!.classList.contains("view-header__title--sm")).toBe(false);
  });

  it("applies the small title modifier when titleSize is 'sm'", () => {
    const { container } = render(<ViewHeader {...baseProps} titleSize="sm" />);
    const title = container.querySelector(".view-header__title");
    expect(title).not.toBeNull();
    expect(title!.classList.contains("view-header__title--sm")).toBe(true);
  });
});

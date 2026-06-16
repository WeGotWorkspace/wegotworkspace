import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListItem } from "@/list-item/src/list-item";

const baseProps = {
  id: "item-1",
  title: "Jane Doe",
  subtitle: "Acme Corp",
  date: "",
  text: "",
  isActive: false,
  isSelected: false,
  selectionMode: false,
  isTouch: false,
  isDragging: false,
  onClick: vi.fn(),
  onLongPress: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
};

describe("ListItem metaPosition", () => {
  it("renders subtitle above title by default (mail/notes layout)", () => {
    const { container } = render(<ListItem {...baseProps} />);
    const content = container.querySelector(".list-item__content");
    expect(content).not.toBeNull();

    const subtitle = content!.querySelector(".list-item__subtitle");
    const title = content!.querySelector(".list-item__title");
    expect(subtitle).not.toBeNull();
    expect(title).not.toBeNull();
    expect(
      subtitle!.compareDocumentPosition(title!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders title above subtitle when metaPosition is below (contacts layout)", () => {
    const { container } = render(<ListItem {...baseProps} metaPosition="below" />);
    const content = container.querySelector(".list-item__content");
    expect(content).not.toBeNull();

    const subtitle = content!.querySelector(".list-item__subtitle");
    const title = content!.querySelector(".list-item__title");
    expect(subtitle).not.toBeNull();
    expect(title).not.toBeNull();
    expect(
      title!.compareDocumentPosition(subtitle!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

/** @vitest-environment jsdom */
import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { isKeyboardFieldTarget } from "@/lib/keyboard/is-keyboard-field-target";

afterEach(() => {
  cleanup();
});

describe("isKeyboardFieldTarget", () => {
  it("returns true for input, textarea, select, and contenteditable", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    const div = document.createElement("div");

    expect(isKeyboardFieldTarget(input)).toBe(true);
    expect(isKeyboardFieldTarget(textarea)).toBe(true);
    expect(isKeyboardFieldTarget(select)).toBe(true);
    expect(isKeyboardFieldTarget(editable)).toBe(true);
    expect(isKeyboardFieldTarget(div)).toBe(false);
  });

  it("returns false when event originates from a plain container", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.tabIndex = 0;
    container.focus();
    expect(isKeyboardFieldTarget(document.activeElement)).toBe(false);
    container.remove();
  });

  it("returns true when focus is inside search input during keydown", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: " " });
    expect(isKeyboardFieldTarget(input)).toBe(true);
    input.remove();
  });
});

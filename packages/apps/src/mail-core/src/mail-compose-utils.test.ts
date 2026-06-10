import { describe, expect, it } from "vitest";
import {
  composeBodyToEditorHtml,
  composeDraftHasContent,
  createComposeAttachment,
  isComposeDraftDirty,
  serializeComposeSnapshot,
} from "@/mail-core/src/mail-compose-utils";

function draft(overrides: Partial<Parameters<typeof composeDraftHasContent>[0]> = {}) {
  return {
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    attachments: [],
    ...overrides,
  };
}

describe("serializeComposeSnapshot", () => {
  it("trims address fields and omits file blobs from attachments", () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const attachment = createComposeAttachment(file);
    const snapshot = serializeComposeSnapshot(
      draft({
        to: " alice@example.com ",
        subject: " Hello ",
        body: "Body",
        attachments: [attachment],
      }),
    );
    const parsed = JSON.parse(snapshot) as {
      to: string;
      subject: string;
      attachments: Array<{ filename: string; file?: File }>;
    };
    expect(parsed.to).toBe("alice@example.com");
    expect(parsed.subject).toBe("Hello");
    expect(parsed.attachments[0]?.filename).toBe("notes.txt");
    expect(parsed.attachments[0]?.file).toBeUndefined();
  });
});

describe("isComposeDraftDirty", () => {
  it("detects changes against baseline snapshot", () => {
    const baseline = serializeComposeSnapshot(draft({ subject: "Draft" }));
    expect(isComposeDraftDirty(draft({ subject: "Draft" }), baseline)).toBe(false);
    expect(isComposeDraftDirty(draft({ subject: "Updated" }), baseline)).toBe(true);
  });
});

describe("composeDraftHasContent", () => {
  it("returns false for empty drafts", () => {
    expect(composeDraftHasContent(draft())).toBe(false);
  });

  it("returns true when any field or attachment is present", () => {
    expect(composeDraftHasContent(draft({ body: "Hi" }))).toBe(true);
    expect(
      composeDraftHasContent(
        draft({ attachments: [createComposeAttachment(new File(["x"], "a.txt"))] }),
      ),
    ).toBe(true);
  });
});

describe("composeBodyToEditorHtml", () => {
  it("returns empty string for blank input", () => {
    expect(composeBodyToEditorHtml("   ")).toBe("");
  });

  it("passes through existing HTML", () => {
    expect(composeBodyToEditorHtml("<p>Ready</p>")).toBe("<p>Ready</p>");
  });

  it("wraps plain text paragraphs and escapes HTML", () => {
    expect(composeBodyToEditorHtml("Hello\n\nTom & Jerry")).toBe(
      "<p>Hello</p><p>Tom &amp; Jerry</p>",
    );
  });
});

describe("createComposeAttachment", () => {
  it("captures file metadata for compose state", () => {
    const file = new File(["data"], "report.pdf", { type: "application/pdf" });
    const attachment = createComposeAttachment(file);
    expect(attachment).toMatchObject({
      filename: "report.pdf",
      mimeType: "application/pdf",
      size: file.size,
      file,
    });
    expect(attachment.id).toMatch(/^att-/);
  });
});

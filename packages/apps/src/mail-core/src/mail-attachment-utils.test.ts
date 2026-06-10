import { describe, expect, it } from "vitest";
import {
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
} from "lucide-react";
import {
  extensionLabelForMailAttachment,
  formatMailAttachmentSize,
  iconForMailAttachment,
  mailAttachmentMetaLabel,
} from "@/mail-core/src/mail-attachment-utils";

describe("iconForMailAttachment", () => {
  it("selects icons from mime type", () => {
    expect(iconForMailAttachment("image/png", "photo.png")).toBe(FileImage);
    expect(iconForMailAttachment("video/mp4", "clip.mp4")).toBe(FileVideo);
    expect(iconForMailAttachment("audio/mpeg", "song.mp3")).toBe(FileAudio);
    expect(iconForMailAttachment("application/pdf", "doc.pdf")).toBe(FileText);
    expect(iconForMailAttachment("text/csv", "sheet.csv")).toBe(FileSpreadsheet);
    expect(iconForMailAttachment("application/zip", "bundle.zip")).toBe(FileArchive);
  });

  it("falls back to extension when mime is missing", () => {
    expect(iconForMailAttachment(undefined, "archive.tar.gz")).toBe(FileArchive);
    expect(iconForMailAttachment(undefined, "readme.txt")).toBe(FileText);
    expect(iconForMailAttachment(undefined, "unknown.bin")).toBe(FileIcon);
  });
});

describe("formatMailAttachmentSize", () => {
  it("formats bytes into human-readable units", () => {
    expect(formatMailAttachmentSize(512)).toBe("512 B");
    expect(formatMailAttachmentSize(2048)).toBe("2.0 KB");
    expect(formatMailAttachmentSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("returns empty string for missing or zero sizes", () => {
    expect(formatMailAttachmentSize(0)).toBe("");
    expect(formatMailAttachmentSize(undefined)).toBe("");
  });
});

describe("extensionLabelForMailAttachment", () => {
  it("uppercases file extensions", () => {
    expect(extensionLabelForMailAttachment("report.pdf")).toBe("PDF");
    expect(extensionLabelForMailAttachment("README")).toBe("");
  });
});

describe("mailAttachmentMetaLabel", () => {
  it("joins extension and size labels", () => {
    expect(mailAttachmentMetaLabel("report.pdf", 1024)).toBe("PDF | 1.0 KB");
    expect(mailAttachmentMetaLabel("README", undefined)).toBe("");
  });
});

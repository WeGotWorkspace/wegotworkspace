import { describe, expect, it, vi } from "vitest";
import {
  filterVcfFiles,
  importVcfFilesBatch,
  isVcfFile,
  partitionVcfFiles,
  readVcfFiles,
  splitVcardBlocks,
} from "@/contacts-core/src/contacts-vcard-import";

describe("isVcfFile", () => {
  it("accepts .vcf/.vcard extensions and vCard MIME types", () => {
    expect(isVcfFile(new File(["x"], "contacts.vcf"))).toBe(true);
    expect(isVcfFile(new File(["x"], "contacts.VCF"))).toBe(true);
    expect(isVcfFile(new File(["x"], "contacts.vcard"))).toBe(true);
    expect(isVcfFile(new File(["x"], "contacts.txt", { type: "text/vcard" }))).toBe(true);
    expect(isVcfFile(new File(["x"], "contacts.txt", { type: "text/x-vcard" }))).toBe(true);
  });

  it("rejects non-vCard files", () => {
    expect(isVcfFile(new File(["x"], "notes.txt", { type: "text/plain" }))).toBe(false);
  });
});

describe("filterVcfFiles", () => {
  it("keeps only vCard files", () => {
    const list = {
      0: new File(["a"], "one.vcf"),
      1: new File(["b"], "two.txt", { type: "text/plain" }),
      2: new File(["c"], "three.vcard"),
      length: 3,
      item(index: number) {
        return this[index as 0 | 1 | 2];
      },
      [Symbol.iterator]() {
        return [this[0], this[1], this[2]][Symbol.iterator]();
      },
    } as FileList;

    expect(filterVcfFiles(list).map((file) => file.name)).toEqual(["one.vcf", "three.vcard"]);
  });
});

describe("partitionVcfFiles", () => {
  it("returns skipped count for mixed selections", () => {
    const list = {
      0: new File(["a"], "one.vcf"),
      1: new File(["b"], "notes.txt", { type: "text/plain" }),
      2: new File(["c"], "two.vcf"),
      length: 3,
      item(index: number) {
        return this[index as 0 | 1 | 2];
      },
      [Symbol.iterator]() {
        return [this[0], this[1], this[2]][Symbol.iterator]();
      },
    } as FileList;

    expect(partitionVcfFiles(list)).toEqual({
      vcfFiles: [list[0], list[2]],
      skippedCount: 1,
    });
  });
});

describe("readVcfFiles", () => {
  it("concatenates multiple files", async () => {
    const files = [
      new File(["BEGIN:VCARD\nFN:One\nEND:VCARD"], "one.vcf"),
      new File(["BEGIN:VCARD\nFN:Two\nEND:VCARD"], "two.vcf"),
    ];
    const text = await readVcfFiles(files);
    expect(text).toContain("FN:One");
    expect(text).toContain("FN:Two");
  });
});

describe("importVcfFilesBatch", () => {
  it("imports each file separately and aggregates contacts", async () => {
    const importOne = vi
      .fn()
      .mockResolvedValueOnce({
        list: [{ id: "card-one", name: { full: "One" } }],
        errors: [],
      })
      .mockResolvedValueOnce({
        list: [{ id: "card-two", name: { full: "Two" } }],
        errors: [],
      });

    const files = [
      new File(["BEGIN:VCARD\nFN:One\nEND:VCARD"], "one.vcf"),
      new File(["BEGIN:VCARD\nFN:Two\nEND:VCARD"], "two.vcf"),
    ];

    const result = await importVcfFilesBatch(files, importOne);

    expect(importOne).toHaveBeenCalledTimes(2);
    expect(result.list).toHaveLength(2);
    expect(result.importedFileCount).toBe(2);
    expect(result.fileErrors).toEqual([]);
  });

  it("keeps successful files when another file fails", async () => {
    const importOne = vi
      .fn()
      .mockResolvedValueOnce({
        list: [{ id: "card-one", name: { full: "One" } }],
        errors: [],
      })
      .mockRejectedValueOnce(new Error("network"));

    const files = [
      new File(["BEGIN:VCARD\nFN:One\nEND:VCARD"], "one.vcf"),
      new File(["BEGIN:VCARD\nFN:Two\nEND:VCARD"], "bad.vcf"),
    ];

    const result = await importVcfFilesBatch(files, importOne);

    expect(result.list).toHaveLength(1);
    expect(result.fileErrors).toEqual([{ fileName: "bad.vcf", message: "Import failed." }]);
  });
});

describe("splitVcardBlocks", () => {
  it("splits multiple cards in one file", () => {
    const input = `BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
END:VCARD
BEGIN:VCARD
VERSION:4.0
FN:Joe Example
END:VCARD`;

    const blocks = splitVcardBlocks(input);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("FN:Jane Doe");
    expect(blocks[1]).toContain("FN:Joe Example");
  });

  it("ignores incomplete blocks", () => {
    expect(splitVcardBlocks("BEGIN:VCARD\nFN:Broken\n")).toEqual([]);
  });
});

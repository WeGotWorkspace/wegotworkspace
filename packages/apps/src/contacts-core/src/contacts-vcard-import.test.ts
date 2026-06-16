import { describe, expect, it } from "vitest";
import {
  filterVcfFiles,
  isVcfFile,
  readVcfFiles,
  splitVcardBlocks,
} from "@/contacts-core/src/contacts-vcard-import";

describe("isVcfFile", () => {
  it("accepts .vcf extension and vCard MIME types", () => {
    expect(isVcfFile(new File(["x"], "contacts.vcf"))).toBe(true);
    expect(isVcfFile(new File(["x"], "contacts.VCF"))).toBe(true);
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
      2: new File(["c"], "three.vcf"),
      length: 3,
      item(index: number) {
        return this[index as 0 | 1 | 2];
      },
      [Symbol.iterator]() {
        return [this[0], this[1], this[2]][Symbol.iterator]();
      },
    } as FileList;

    expect(filterVcfFiles(list).map((file) => file.name)).toEqual(["one.vcf", "three.vcf"]);
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

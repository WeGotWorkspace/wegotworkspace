/** Whether a dropped/selected file is a vCard import candidate. */
export function isVcfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".vcf") ||
    name.endsWith(".vcard") ||
    file.type === "text/vcard" ||
    file.type === "text/x-vcard" ||
    file.type === "application/vcard"
  );
}

/** Keep only `.vcf` / `.vcard` / vCard MIME files from a file list. */
export function filterVcfFiles(fileList: FileList | null): File[] {
  return partitionVcfFiles(fileList).vcfFiles;
}

/** Split a selection into importable vCard files and skipped non-vCard files. */
export function partitionVcfFiles(fileList: FileList | null): {
  vcfFiles: File[];
  skippedCount: number;
} {
  if (!fileList || fileList.length === 0) {
    return { vcfFiles: [], skippedCount: 0 };
  }
  const all = Array.from(fileList);
  const vcfFiles = all.filter(isVcfFile);
  return { vcfFiles, skippedCount: all.length - vcfFiles.length };
}

/** Read one or more vCard files and concatenate their text (RFC 6350 multi-vCard). */
export async function readVcfFiles(files: File[]): Promise<string> {
  const texts = await Promise.all(files.map((file) => file.text()));
  return texts.join("\r\n");
}

export type VcfFileImportError = {
  fileName: string;
  message: string;
};

export type VcfImportResponseLike<TCard> = {
  list: TCard[];
  errors?: Array<{ index: number; message: string }>;
};

export type VcfFilesImportAggregate<TCard> = {
  list: TCard[];
  fileErrors: VcfFileImportError[];
  blockErrors: number;
  importedFileCount: number;
};

/**
 * Import each vCard file with a separate API call and aggregate results.
 * Keeps successful imports when one file in a multi-select batch fails.
 */
export async function importVcfFilesBatch<TCard>(
  files: File[],
  importOne: (vcardText: string) => Promise<VcfImportResponseLike<TCard>>,
): Promise<VcfFilesImportAggregate<TCard>> {
  const list: TCard[] = [];
  const fileErrors: VcfFileImportError[] = [];
  let blockErrors = 0;
  let importedFileCount = 0;

  for (const file of files) {
    try {
      const text = await file.text();
      if (text.trim() === "") {
        fileErrors.push({ fileName: file.name, message: "Empty file." });
        continue;
      }

      const result = await importOne(text);
      blockErrors += result.errors?.length ?? 0;

      if (result.list.length > 0) {
        importedFileCount += 1;
        list.push(...result.list);
        continue;
      }

      if ((result.errors?.length ?? 0) > 0) {
        fileErrors.push({ fileName: file.name, message: "No contacts imported." });
      } else {
        fileErrors.push({ fileName: file.name, message: "No vCard data found." });
      }
    } catch {
      fileErrors.push({ fileName: file.name, message: "Import failed." });
    }
  }

  return { list, fileErrors, blockErrors, importedFileCount };
}

/**
 * Split a vCard file into individual `BEGIN:VCARD` … `END:VCARD` blocks.
 * Mirrors server-side ContactCardVcfImportSupport::splitVcards.
 */
export function splitVcardBlocks(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split(/(?=BEGIN:VCARD)/i).filter((part) => part.trim() !== "");
  const blocks: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!trimmed.toUpperCase().includes("END:VCARD")) continue;
    blocks.push(trimmed);
  }

  return blocks;
}

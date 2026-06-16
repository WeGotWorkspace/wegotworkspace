/** Whether a dropped/selected file is a vCard import candidate. */
export function isVcfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".vcf") ||
    file.type === "text/vcard" ||
    file.type === "text/x-vcard" ||
    file.type === "application/vcard"
  );
}

/** Keep only `.vcf` / vCard MIME files from a file list. */
export function filterVcfFiles(fileList: FileList | null): File[] {
  if (!fileList || fileList.length === 0) return [];
  return Array.from(fileList).filter(isVcfFile);
}

/** Read one or more vCard files and concatenate their text (RFC 6350 multi-vCard). */
export async function readVcfFiles(files: File[]): Promise<string> {
  const texts = await Promise.all(files.map((file) => file.text()));
  return texts.join("\r\n");
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

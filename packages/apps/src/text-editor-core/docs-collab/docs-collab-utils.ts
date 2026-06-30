import type { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { docsEditorFormatFromFileName } from "@/docs-core/src/docs-editor-format";
import type { TextEditorContentFormat } from "@/text-editor-core/src/text-editor-content";

export const MESH_ORIGIN = "mesh";
export const SEED_ORIGIN = "seed";
export const SERVER_ORIGIN = "server";
export const IDB_ORIGIN = "idb";

const REMOTE_UPDATE_ORIGINS = new Set<string>([
  MESH_ORIGIN,
  SEED_ORIGIN,
  SERVER_ORIGIN,
  IDB_ORIGIN,
]);

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#ea580c",
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

export function isYDocEmpty(doc: Y.Doc): boolean {
  return doc.getXmlFragment("default").length === 0;
}

export function collabDocumentFormat(room: string | undefined): TextEditorContentFormat {
  const fileName = room?.split("/").pop() ?? "";
  const format = docsEditorFormatFromFileName(fileName);
  return format === "markdown" ? "markdown" : "text";
}

export function isRemoteUpdateOrigin(
  origin: unknown,
  persistence: IndexeddbPersistence | null,
): boolean {
  if (typeof origin === "string" && REMOTE_UPDATE_ORIGINS.has(origin)) return true;
  if (origin === persistence) return true;
  return false;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function docSignature(markdown: string, ydoc: Y.Doc): string {
  const vectorHex = bytesToHex(Y.encodeStateVector(ydoc));
  const markdownHash = hashString(markdown).toString(16);
  return `${markdown.length}:${markdownHash}:${vectorHex}`;
}

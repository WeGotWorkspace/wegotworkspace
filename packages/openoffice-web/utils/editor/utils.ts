import { DocumentType } from "./types";

export function getFileExt(name: string) {
  const type = name.split(".").pop() || "";
  return type.toLowerCase();
}

export const SUPPORTED_FILE_TYPES = ["docx", "xlsx", "pptx", "pdf"] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

export function normalizeSupportedFileType(
  fileType?: string | null,
): SupportedFileType | null {
  const normalized = (fileType || "").toLowerCase();
  if (!normalized) {
    return null;
  }
  if ((SUPPORTED_FILE_TYPES as readonly string[]).includes(normalized)) {
    return normalized as SupportedFileType;
  }
  return null;
}

export enum AppType {
  word = 1,
  slide = 3,
  cell = 2,
  pdf = 5,
}

export const docTypeMap = {
  docx: AppType.word,
  pptx: AppType.slide,
  xlsx: AppType.cell,
  pdf: AppType.pdf,
};

export function getDocumentType(ext: string) {
  const code = docTypeMap[ext.toLowerCase() as keyof typeof docTypeMap];
  const type = AppType[code] as DocumentType;
  return type || DocumentType.Word;
}

/** Returns the URL for creating a new document of the given type. */
export function getNewUrl(type: string) {
  return `/editor?new=${type}`;
}

const ONLYOFFICE_BUNDLE = "/v9.3.0.24-1";

/**
 * Path to the ONLYOFFICE web-apps bundle.
 * Resolved at call time so injected {@code __SABRE_OFFICE_CONFIG__.office_path} can win.
 */
export function getAppRoot(): string {
  if (typeof window !== "undefined") {
    const w = window as unknown as { __SABRE_OFFICE_CONFIG__?: { office_path?: string } };
    const p = w.__SABRE_OFFICE_CONFIG__?.office_path;
    if (typeof p === "string" && p.length > 0) {
      const norm = p.replace(/\/+$/, "");
      return `${norm}${ONLYOFFICE_BUNDLE}`;
    }
  }
  const fromEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_ROOT || "" : "";
  if (fromEnv) {
    return fromEnv;
  }
  return ONLYOFFICE_BUNDLE;
}

/** Absolute URL for x2t assets (same-origin), e.g. {@code https://host/office/x2t/}. */
export function getX2tBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const prefix = (() => {
    const w = window as unknown as { __SABRE_OFFICE_CONFIG__?: { office_path?: string } };
    const p = w.__SABRE_OFFICE_CONFIG__?.office_path;
    if (typeof p === "string" && p.length > 0) {
      return p.replace(/\/+$/, "");
    }
    return typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OFFICE_BASE_PATH || "" : "";
  })();
  return `${window.location.origin}${prefix}/x2t/`;
}

export const APP_ROOT = getAppRoot();
export const PRELOAD_HTML = "/web-apps/apps/api/documents/preload.html";
export const API_JS = "/web-apps/apps/api/documents/api.js";

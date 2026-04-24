import { DocumentType } from "./types";

export function getFileExt(name: string) {
  const type = name.split(".").pop() || "";
  return type.toLowerCase();
}

export enum AppType {
  word = 1,
  slide = 3,
  cell = 2,
  draw = 4,
  pdf = 5,
}

export const docTypeMap = {
  docx: AppType.word,
  doc: AppType.word,
  odt: AppType.word,
  rtf: AppType.word,
  txt: AppType.word,
  html: AppType.word,
  mht: AppType.word,
  epub: AppType.word,
  fb2: AppType.word,
  mobi: AppType.word,
  docm: AppType.word,
  dotx: AppType.word,
  dotm: AppType.word,
  oform: AppType.word,
  docxf: AppType.word,

  pptx: AppType.slide,
  ppt: AppType.slide,
  odp: AppType.slide,
  ppsx: AppType.slide,
  pptm: AppType.slide,
  ppsm: AppType.slide,
  potx: AppType.slide,
  potm: AppType.slide,
  otp: AppType.slide,
  odg: AppType.slide,

  xlsx: AppType.cell,
  xls: AppType.cell,
  ods: AppType.cell,
  csv: AppType.cell,
  xlsm: AppType.cell,
  xltx: AppType.cell,
  xltm: AppType.cell,
  xlsb: AppType.cell,
  ots: AppType.cell,

  vsdx: AppType.draw,
  vssx: AppType.draw,
  vstx: AppType.draw,
  vsdm: AppType.draw,
  vssm: AppType.draw,
  vstm: AppType.draw,

  pdf: AppType.pdf,
};

export function getDocumentType(ext: string) {
  const code = docTypeMap[ext.toLowerCase() as keyof typeof docTypeMap];
  const type = AppType[code] as DocumentType;
  return type || DocumentType.Word;
}

export function getNewUrl(type: string) {
  return `/editor?new=${type}`;
}

const ONLYOFFICE_BUNDLE = "/v9.3.0.24-1";

/**
 * Path to the ONLYOFFICE web-apps bundle (must match {@code public/v9.3.0.24-1}).
 * Resolved at **call time** so Sabre’s injected {@code __SABRE_OFFICE_CONFIG__.office_path} wins even when
 * {@code NEXT_PUBLIC_*} was missing at {@code next build} time.
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
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_ROOT ||
        (process.env.NEXT_PUBLIC_OFFICE_BASE_PATH
          ? `${process.env.NEXT_PUBLIC_OFFICE_BASE_PATH}${ONLYOFFICE_BUNDLE}`
          : "")
      : "";
  if (fromEnv) {
    return fromEnv;
  }
  return ONLYOFFICE_BUNDLE;
}

/** Absolute URL for x2t assets (same origin), e.g. {@code https://host/office/x2t/} (matches {@code public/x2t}). */
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

export const PRELOAD_HTML = "/web-apps/apps/api/documents/preload.html";
export const API_JS = "/web-apps/apps/api/documents/api.js";

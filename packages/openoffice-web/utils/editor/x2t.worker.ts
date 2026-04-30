/// <reference lib="webworker" />

import { AvsFileType, X2tConvertParams, X2tConvertResult } from "./types";

/**
 * X2T Converter Web Worker (Turbopack may load this from a blob URL, so the main thread
 * must send {@code __sabre_x2t_init} with an absolute {@code baseUrl} ending in {@code /x2t/}).
 */

/* eslint-disable no-restricted-globals */

let wasmBaseUrl = "";

let x2t: any = null;
let initPromise: Promise<void> | null = null;

function resolveX2tBaseUrlFallback(): string {
  try {
    const u = new URL(self.location.href);
    if (u.protocol === "blob:") {
      return "";
    }
    const idx = u.pathname.indexOf("/_next/");
    const base = idx >= 0 ? u.pathname.slice(0, idx) : "";
    return `${u.origin}${base}/x2t/`;
  } catch {
    return `${self.location.origin}/x2t/`;
  }
}

async function initX2tFromBase(baseUrl: string): Promise<void> {
  if (x2t) {
    return;
  }
  const root = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const scriptUrl = `${root}x2t.js`;

  Object.assign(self, {
    __filename: root,
  });

  importScripts(scriptUrl);

  x2t = (self as any).Module;

  await new Promise<void>((resolve) => {
    if (!x2t) {
      resolve();
      return;
    }
    x2t.onRuntimeInitialized = () => resolve();
  });

  try {
    x2t.FS.mkdir("/working");
    x2t.FS.mkdir("/working/media");
    x2t.FS.mkdir("/working/fonts");
    x2t.FS.mkdir("/working/themes");
  } catch (err) {
    console.error("[x2t.worker] mkdir error:", err);
  }

  console.log("[x2t.worker] Initialized successfully");
}

async function ensureInit(): Promise<void> {
  if (x2t) {
    return;
  }
  if (!wasmBaseUrl) {
    wasmBaseUrl = resolveX2tBaseUrlFallback();
  }
  if (!wasmBaseUrl) {
    throw new Error(
      "x2t base URL missing: main thread must send __sabre_x2t_init (blob workers cannot infer /office/x2t/)",
    );
  }
  if (!initPromise) {
    initPromise = initX2tFromBase(wasmBaseUrl);
  }
  return initPromise;
}

/**
 * Clean up temporary files after conversion
 */
function cleanupFiles(files: string[]): void {
  if (!x2t) return;
  for (const file of files) {
    try {
      x2t.FS.unlink(file);
    } catch (err) {
      console.error(err);
    }
  }
  cleanMedia();
}

function cleanMedia() {
  if (!x2t) return;
  try {
    const mediaFiles = x2t.FS.readdir("/working/media/");
    for (const file of mediaFiles) {
      if (file !== "." && file !== "..") {
        x2t.FS.unlink("/working/media/" + file);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

/**
 * Read media files from the working directory
 */
function readMedia(): { [key: string]: Uint8Array<ArrayBuffer> } {
  if (!x2t) return {};
  const media: { [key: string]: Uint8Array<ArrayBuffer> } = {};
  try {
    const files = x2t.FS.readdir("/working/media/");
    for (const file of files) {
      if (file !== "." && file !== "..") {
        const fileData = x2t.FS.readFile("/working/media/" + file, {
          encoding: "binary",
        });
        media[file] = fileData;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return media;
}

const xmlPath = "/working/params.xml";

function writeInputs({
  fileFrom,
  fileTo,
  formatFrom,
  formatTo,
  data,
  media,
}: X2tConvertParams) {
  if (!x2t) {
    throw new Error("x2t not initialized");
  }
  const params = {
    m_sFileFrom: fileFrom,
    m_sThemeDir: "/working/themes",
    m_sFileTo: fileTo,
    m_nFormatFrom: formatFrom,
    m_nFormatTo: formatTo,
    m_bIsPDFA: formatTo === AvsFileType.AVS_FILE_CROSSPLATFORM_PDFA,
    m_bIsNoBase64: false,
    m_sFontDir: "/working/fonts/",
  };

  const content = Object.entries(params)
    .filter(([k, v]) => v)
    .reduce((a, [k, v]) => a + `<${k}>${v}</${k}>\n`, "");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<TaskQueueDataConvert
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
>
${content}
</TaskQueueDataConvert>`;

  x2t.FS.writeFile(xmlPath, xml);
  if (data) {
    x2t.FS.writeFile(fileFrom, new Uint8Array(data));
  }

  if (media) {
    cleanMedia();
    for (const [key, value] of Object.entries(media)) {
      try {
        x2t.FS.writeFile("/working/" + key, value);
      } catch (err) {
        console.error(key, err);
      }
    }
  }
}

async function convert({
  data,
  fileFrom,
  fileTo,
  formatFrom,
  formatTo,
  media,
  fonts,
  themes,
}: X2tConvertParams): Promise<X2tConvertResult> {
  if (!x2t) {
    throw new Error("x2t not initialized");
  }
  const fromPath = "/working/" + fileFrom;
  const toPath = "/working/" + fileTo;
  const files = [fromPath, toPath, xmlPath];

  writeInputs({
    fileFrom: fromPath,
    fileTo: toPath,
    formatFrom,
    formatTo,
    data,
    media,
  });

  if (
    fileFrom.endsWith(".doc") ||
    formatFrom == AvsFileType.AVS_FILE_DOCUMENT_DOC
  ) {
    const viaPath = fromPath + ".docx";
    writeInputs({
      fileFrom: fromPath,
      fileTo: viaPath,
      data: null as never,
    });
    x2t.ccall("main1", ["number"], ["string"], [xmlPath]);
    writeInputs({
      fileFrom: viaPath,
      fileTo: toPath,
      data: null as never,
    });
    files.push(viaPath);
  }

  try {
    const pathInfo = x2t.FS.analyzePath(toPath);
    if (pathInfo.exists) {
      x2t.FS.unlink(toPath);
    }
  } catch (err) {}

  try {
    x2t.ccall("main1", ["number"], ["string"], [xmlPath]);
  } catch (e) {
    console.error("ccall", e);
  }

  // Read output file
  let output: Uint8Array<ArrayBuffer> | null = null;
  try {
    output = x2t.FS.readFile(toPath);
  } catch (e) {
    console.error(e);
  }

  // Read media files
  const outputMedia = readMedia();

  // Cleanup temporary files
  setTimeout(() => {
    cleanupFiles(files);
  });

  return { output, media: outputMedia };
}

interface WorkerMessage {
  id?: number;
  type: "convert" | "__sabre_x2t_init";
  payload?: X2tConvertParams;
  baseUrl?: string;
  error?: string;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload, baseUrl } = event.data;

  if (type === "__sabre_x2t_init") {
    try {
      wasmBaseUrl = String(baseUrl || "").replace(/\/?$/, "/");
      await initX2tFromBase(wasmBaseUrl);
      initPromise = Promise.resolve();
      self.postMessage({ type: "__sabre_x2t_ready" });
    } catch (error) {
      self.postMessage({
        type: "__sabre_x2t_error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (type !== "convert" || id === undefined) {
    if (id !== undefined) {
      self.postMessage({
        id,
        type: "error",
        error: `Unknown message type: ${type}`,
      });
    }
    return;
  }

  try {
    await ensureInit();
    const result = await convert(payload as X2tConvertParams);

    const transferables: Transferable[] = [];
    if (result.output) {
      transferables.push(result.output.buffer);
    }
    Object.values(result.media).forEach((m) => transferables.push(m.buffer));

    self.postMessage(
      { id, type: "convert:done", payload: result },
      { transfer: transferables },
    );
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Signal that worker is ready
self.postMessage({ type: "ready" });

import { converter } from "./x2t";
import { MockSocket } from "./socket";
import { User, Participant, AscSaveTypes } from "./types";
import { emptyDocx, emptyPdf, emptyPptx, emptyXlsx } from "./empty";
import {
  getDocumentType,
  getFileExt,
  normalizeSupportedFileType,
  SUPPORTED_FILE_TYPES,
  SupportedFileType,
} from "./utils";
import {
  filesResourcePathname,
  readSabreOfficeConfig,
  webdavPutOfficeFile,
} from "@/lib/sabre-office-dav";
import { saveOfficeDocumentViaApi } from "@/lib/sabre-office-save";

function mergeBuffers(buffers: Uint8Array[]) {
  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.length, 0);
  const mergedBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    mergedBuffer.set(buffer, offset);
    offset += buffer.length;
  }
  return mergedBuffer;
}

function randomId() {
  return Math.random().toString(36).substring(2, 9);
}

function getUrl(data: Uint8Array, type?: string) {
  const blob = new Blob([data as Uint8Array<ArrayBuffer>], {
    type: type || "application/octet-stream",
  });
  return URL.createObjectURL(blob);
}

const OFFICE_SAVE_EXT = new Set(["docx", "xlsx", "pptx", "pdf"]);

/** Single-segment filename for {@code files/users/…/} (no path separators). */
function filenameForWebDavSave(
  cmdTitle: string | undefined,
  fallbackTitle: string,
  fileType: string,
): string {
  const ext = (fileType || "docx").toLowerCase();
  let raw = (cmdTitle || fallbackTitle || "Document").trim().replace(/^.*[/\\]/, "");
  raw = raw.replace(/[\x00-\x1f<>|:*?"\\/]+/g, "_");
  if (raw === "" || raw === "." || raw === "..") {
    return `Document.${ext}`;
  }
  const m = /\.([^.\\/]+)$/.exec(raw);
  const last = m ? m[1].toLowerCase() : "";
  if (!OFFICE_SAVE_EXT.has(last)) {
    const stem = m ? raw.slice(0, raw.length - m[0].length) : raw;
    const cleanStem = stem.replace(/\.+$/, "") || "Document";
    return `${cleanStem}.${ext}`;
  }
  return raw;
}

export class EditorServer {
  private id = "";
  private socket: MockSocket | null = null;
  private sessionId: string = "session-id";
  private user: User = {
    id: "uid",
    name: "Me",
  };
  private client = {
    buildVersion: "9.3.0",
    buildNumber: 8,
  };
  private participants: Participant[] = [];
  private syncChangesIndex = 0;
  private loadPromise: Promise<void> | null = null;

  private file: File | null = null;
  private fileType: SupportedFileType = "docx";
  private title: string = "";
  private fsMap: Map<string, Uint8Array> = new Map();
  private urlsMap: Map<string, string> = new Map();

  private downloadId: string = "";
  private downloadParts: Uint8Array[] = [];
  /** Same-origin WebDAV pathname for the open document, when applicable. */
  private webdavResourcePath: string | null = null;

  constructor() {
    this.send = this.send.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  async open(
    file: File,
    { fileType, fileName }: { fileType?: string; fileName?: string } = {},
  ) {
    this.webdavResourcePath = null;
    const title = fileName || file.name;
    this.fileType = this.resolveSupportedFileType(fileType || getFileExt(file.name));
    const documentType = getDocumentType(this.fileType);
    this.id = randomId();
    this.file = file;
    this.title = title;
    const buffer = await file.arrayBuffer();
    this.loadPromise = this.loadDocument(buffer, this.fileType);

    return {
      id: this.id,
      documentType,
    };
  }

  openNew(fileType?: string) {
    this.webdavResourcePath = null;
    this.fileType = this.resolveSupportedFileType(fileType);
    // TODO: should generate new id?
    this.id = this.id || randomId();
    this.title = "New Document";
    const documentType = getDocumentType(this.fileType);

    let binData: Uint8Array | null = null;

    switch (documentType) {
      case "word":
        binData = Uint8Array.from(emptyDocx, (v) => v.charCodeAt(0));
        break;
      case "cell":
        binData = Uint8Array.from(emptyXlsx, (v) => v.charCodeAt(0));
        break;
      case "slide":
        binData = Uint8Array.from(emptyPptx, (v) => v.charCodeAt(0));
        break;
      case "pdf":
        binData = Uint8Array.from(emptyPdf, (v) => v.charCodeAt(0));
        break;
    }

    if (!binData) {
      throw new Error("Failed to create new document");
    }

    this.fsMap.set("Editor.bin", binData);
    this.urlsMap.set("Editor.bin", getUrl(binData));

    return {
      id: this.id,
      documentType: documentType,
    };
  }

  async openUrl(
    url: string,
    {
      fileType,
      fileName,
      loader = (url: string) => fetch(url).then((res) => res.arrayBuffer()),
    }: {
      fileType?: string;
      fileName?: string;
      loader?: (url: string) => Promise<ArrayBuffer>;
    } = {},
  ) {
    this.webdavResourcePath = null;
    const title = fileName || decodeURIComponent(url.split("/").pop() || "Document");
    this.fileType = this.resolveSupportedFileType(fileType || getFileExt(title));
    const documentType = getDocumentType(this.fileType);
    this.id = randomId();
    this.title = title;
    this.loadPromise = this.loadDocument(() => loader(url), this.fileType);

    return {
      id: this.id,
      documentType,
    };
  }

  /**
   * Opens a document from same-origin WebDAV and keeps the path so future saves PUT back to that resource.
   */
  async openFromWebDav(
    webdavPathname: string,
    opts: { fileType?: string; fileName?: string } = {},
  ) {
    this.webdavResourcePath = webdavPathname;
    const name =
      opts.fileName || webdavPathname.split("/").filter(Boolean).pop() || "Document";
    const ft = this.resolveSupportedFileType(opts.fileType || getFileExt(name));
    const documentType = getDocumentType(ft);
    this.id = randomId();
    this.title = name;
    this.fileType = ft;
    const absolute = new URL(webdavPathname, window.location.origin).href;
    this.loadPromise = this.loadDocument(
      () =>
        fetch(absolute, { credentials: "include" }).then((res) => {
          if (!res.ok) {
            throw new Error(`WebDAV open failed: ${res.status}`);
          }
          return res.arrayBuffer();
        }),
      this.fileType,
    );

    return {
      id: this.id,
      documentType,
    };
  }

  getDocument() {
    if (!this.id) {
      this.openNew();
    }

    return {
      fileType: this.fileType,
      key: this.id,
      title: this.title,
      url: "/" + this.id,
    };
  }

  getUser() {
    return this.user;
  }

  private resolveSupportedFileType(fileType?: string): SupportedFileType {
    const normalized = normalizeSupportedFileType(fileType || "docx");
    if (normalized) {
      return normalized;
    }
    throw new Error(
      `Unsupported file type: "${fileType}". Supported types: ${SUPPORTED_FILE_TYPES.join(", ")}`,
    );
  }

  private async loadDocument(
    buffer: ArrayBuffer | (() => Promise<ArrayBuffer>),
    fileType: string,
  ) {
    if (typeof buffer == "function") {
      buffer = await buffer();
    }

    let output: Uint8Array | null = null;
    let media: { [key: string]: Uint8Array } = {};

    if (fileType == "pdf") {
      output = new Uint8Array(buffer);
    } else {
      const result = await converter.convert({
        data: buffer,
        fileFrom: "doc." + fileType,
        fileTo: "Editor.bin",
      });
      output = result.output;
      media = result.media;
    }

    if (!output) {
      throw new Error("Failed to convert file");
    }

    if (this.urlsMap.size > 0) {
      this.urlsMap.forEach((url) => URL.revokeObjectURL(url));
    }
    this.fsMap.set("Editor.bin", output);
    this.urlsMap.set("Editor.bin", getUrl(output));
    for (const name in media) {
      this.addMedia(name, media[name]);
    }
  }

  private addMedia(name: string, data: Uint8Array) {
    const pathname = "media/" + name;
    const url = getUrl(data);
    this.fsMap.set(pathname, data);
    this.urlsMap.set(pathname, url);
    return url;
  }

  setClient(info: Partial<typeof this.client>) {
    this.client = {
      ...this.client,
      ...info,
    };
  }

  handleConnect({ socket }: { socket: MockSocket }) {
    console.log("connect: ", socket);

    this.socket = socket;
    const { send, sessionId, client } = this;

    this.participants = [
      {
        connectionId: this.sessionId,
        encrypted: false,
        id: this.user.id,
        idOriginal: this.user.id,
        indexUser: 1,
        isCloseCoAuthoring: false,
        isLiveViewer: false,
        username: this.user.name,
        view: false,
      },
    ];

    socket.server.on("message", this.handleMessage);

    send({
      maxPayload: 100000000,
      pingInterval: 25000,
      pingTimeout: 20000,
      sid: sessionId,
      upgrades: [],
    });

    send({
      type: "license",
      license: {
        type: 3,
        buildNumber: client.buildNumber,
        buildVersion: client.buildVersion,
        light: false,
        mode: 0,
        rights: 1,
        protectionSupport: true,
        isAnonymousSupport: true,
        liveViewerSupport: true,
        branding: false,
        customization: true,
        advancedApi: false,
      },
    });
  }

  handleDisconnect({ socket }: { socket: MockSocket }) {
    console.log("disconnect: ", socket);
    this.socket = null;
  }

  send(...msg: unknown[]) {
    if (!this.socket) {
      console.error("Socket is not connected");
      return;
    }
    console.log("[ws] >> ", ...msg);
    this.socket.server.emit("message", ...msg);
  }

  async handleMessage(msg: Record<string, unknown>, ...args: unknown[]) {
    console.log("[ws] << ", msg, args);

    const { send, sessionId, participants, user, client } = this;
    const type =
      typeof msg === "object" && msg && "type" in msg ? msg.type : null;
    switch (type) {
      case "auth":
        const changes: unknown[] = [];
        send({
          type: "authChanges",
          changes: changes,
        });
        send({
          type: "auth",
          result: 1,
          sessionId: sessionId,
          participants: participants,
          locks: [],
          //   changes: changes,
          //   changesIndex: 0,
          indexUser: 1,
          buildVersion: client.buildVersion || "9.3.0",
          buildNumber: client.buildNumber || 9,
          licenseType: 3,
          editorType: 2,
          mode: "edit",
          permissions: {
            comment: true,
            chat: true,
            download: true,
            edit: true,
            fillForms: false,
            modifyFilter: true,
            protect: true,
            print: true,
            review: false,
            copy: true,
          },
        });

        try {
          if (this.loadPromise) {
            await this.loadPromise;
          }
          send({
            type: "documentOpen",
            data: {
              type: "open",
              status: "ok",
              data: {
                ...Object.fromEntries(this.urlsMap),
              },
            },
          });
        } catch (err) {
          console.error(err);
          // TODO: send error message
          send({
            type: "documentOpen",
            data: {
              type: "open",
              status: "ok",
              data: {
                "Editor.bin": "",
              },
            },
          });
        }
        break;
      case "isSaveLock":
        send({
          type: "saveLock",
          saveLock: false,
        });
        break;
      case "saveChanges":
        send({
          type: "unSaveLock",
          index: -1,
          syncChangesIndex: ++this.syncChangesIndex,
          time: +new Date(),
        });
        break;
      case "getLock": {
        const block = String(msg.block ?? "");
        send({
          type: "getLock",
          locks: {
            [block]: {
              time: +new Date(),
              user: user?.id,
              block,
            },
          },
        });
        send({
          type: "releaseLock",
          locks: {
            [block]: {
              time: +new Date(),
              user: user?.id,
              block,
            },
          },
        });
        break;
      }
    }
  }

  async handleRequest(req: Request) {
    const u = new URL(req.url);

    const { id: key, send } = this;
    // console.log("[msg] server: ", u, key);

    if (u.pathname.endsWith("/downloadas/" + key)) {
      const cmd = JSON.parse(u.searchParams.get("cmd") || "{}") as {
        title?: string;
        format?: string;
        outputformat?: number;
        savetype?: number;
      };
      const buffer = await req.arrayBuffer();

      console.log("downloadAs -> ", cmd, buffer);

      const cmdTitle = String(cmd.title ?? this.title ?? "Document");
      const fileTo = "doc." + cmdTitle.split(".").pop();
      let formatTo = cmd.outputformat;
      if (!formatTo && fileTo.endsWith(".pdf")) {
        formatTo = 513;
      }

      const download = async (): Promise<{ status: "ok" | "error"; dataUrl?: string }> => {
        const input = mergeBuffers(this.downloadParts);
        let fileFrom = "from.bin";
        if (cmd.format == "pdf") {
          fileFrom = "from.pdf";
        }

        let { output } = await converter.convert({
          data: input.buffer,
          fileFrom: fileFrom,
          fileTo: fileTo,
          formatTo: formatTo,
          media: Object.fromEntries(this.fsMap),
        });
        if (!output && cmd.format == "pdf") {
          output = input;
        }
        if (!output) {
          console.error("Conversion failed");
          return { status: "error", dataUrl: "data:," };
        }
        const dataUrl = getUrl(new Uint8Array(output));

        const cfg = readSabreOfficeConfig();
        if (cfg) {
          const putPathname =
            this.webdavResourcePath ??
            filesResourcePathname(
              cfg.base_uri,
              `users/${cfg.username.replace(/[/\\]+/g, "_")}/${filenameForWebDavSave(cmdTitle, this.title, this.fileType)}`,
            );
          const bytes = new Uint8Array(output);
          const saveTransport = cfg.save_transport ?? "webdav+api";

          if (saveTransport !== "api") {
            try {
              await webdavPutOfficeFile(
                cfg.base_uri,
                putPathname,
                bytes,
                cmdTitle || this.title,
              );
              if (!this.webdavResourcePath) {
                this.webdavResourcePath = putPathname;
              }
              return { status: "ok", dataUrl };
            } catch (e) {
              console.error("WebDAV save failed", e);
              if (saveTransport === "webdav") {
                throw e;
              }
            }
          }

          if (saveTransport !== "webdav") {
            try {
              await saveOfficeDocumentViaApi(
                putPathname,
                bytes,
                cfg.save_api_path || "/api/v1/office/documents",
              );
              if (!this.webdavResourcePath) {
                this.webdavResourcePath = putPathname;
              }
              return { status: "ok", dataUrl };
            } catch (apiErr) {
              console.warn("API save failed", apiErr);
            }
          }
        }

        const blob = new Blob([new Uint8Array(output)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = cmdTitle;
        a.click();
        URL.revokeObjectURL(url);

        return { status: "ok", dataUrl };
      };

      let result: { status: "ok" | "error"; dataUrl?: string } = { status: "ok" };

      switch (Number(cmd.savetype)) {
        case AscSaveTypes.PartStart:
          this.downloadId = "_" + Math.round(Math.random() * 1000);
          this.downloadParts = [new Uint8Array(buffer)];
          break;
        case AscSaveTypes.Part:
          this.downloadParts.push(new Uint8Array(buffer));
          break;
        case AscSaveTypes.Complete:
          this.downloadParts.push(new Uint8Array(buffer));
          result = await download();
          this.downloadParts = [];
          break;
        case AscSaveTypes.CompleteAll:
          this.downloadId = "_" + Math.round(Math.random() * 1000);
          this.downloadParts = [new Uint8Array(buffer)];
          result = await download();
          this.downloadParts = [];
          break;
      }

      setTimeout(() => {
        send({
          type: "documentOpen",
          data: {
            type: "save",
            status: result.status,
            data: result.dataUrl || "data:,",
            filetype: this.fileType,
          },
        });
      }, 100);

      return Response.json({
        status: result.status,
        type: "save",
        data: this.downloadId,
      });
    }

    if (u.pathname.endsWith("/upload/" + key)) {
      const buffer = await req.arrayBuffer();
      const data = new Uint8Array(buffer);
      const filename = Date.now() + ".png";
      const pathname = "media/" + filename;
      const url = this.addMedia(filename, data);
      return Response.json({ [pathname]: url });
    }

    if (u.pathname == "/plugins.json") {
      return Response.json({ url: "", pluginsData: [], autostart: [] });
    }

    return null;
  }
}

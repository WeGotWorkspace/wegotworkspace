"use client";

import { useEffect, useRef } from "react";
import { useAppStore, useResolvedLanguage, useHasHydrated } from "@/store";
import {
  API_JS,
  getAppRoot,
  getDocumentType,
  PRELOAD_HTML,
} from "@/utils/editor/utils";
import io, { MockSocket } from "@/utils/editor/socket";
import { createFetchProxy } from "@/utils/editor/fetch";
import { createXHRProxy } from "@/utils/editor/xhr";
import { DocEditor } from "@/utils/editor/types";
import { publicUrl } from "@/lib/public-url";
import {
  filesResourcePathname,
  parseOfficeFileParam,
  readSabreOfficeConfig,
} from "@/lib/sabre-office-dav";

const HIDE_FILE_TAB_STYLE_ID = "sabre-hide-onlyoffice-file-tab";

/**
 * The bundled AGPL editor ignores {@code customization.layout.toolbar.file} (ONLYOFFICE documents
 * that as white-label / commercial). Tabs are real DOM: {@code li.ribtab > a[data-tab="file"]}; see
 * upstream web-apps {@code Mixtbar.js} and {@code documenteditor/.../Toolbar.js}.
 */
function hideOnlyOfficeFileRibbon(): void {
  const iframe = document.querySelector<HTMLIFrameElement>(
    'iframe[name="frameEditor"]',
  );
  const doc = iframe?.contentDocument;
  if (!doc?.head || doc.getElementById(HIDE_FILE_TAB_STYLE_ID)) {
    return;
  }
  const style = doc.createElement("style");
  style.id = HIDE_FILE_TAB_STYLE_ID;
  style.textContent = `
    li.ribtab:has(> a[data-tab="file"]),
    .more-container[data-tab="file"] {
      display: none !important;
    }
  `;
  doc.head.appendChild(style);
}

export default function Page() {
  const server = useAppStore((state) => state.server);
  const language = useResolvedLanguage();
  const theme = useAppStore((state) => state.theme);
  const hasHydrated = useHasHydrated();
  const isDirty = useRef(false);
  const editorRef = useRef<DocEditor | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    let disposed = false;

    const boot = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const fileId = searchParams.get("fileId");
      const newDoc = searchParams.get("new");
      // `file` is canonical; `page` is a deep-link alias (e.g. from Drive UI bookmarks).
      const sabreFile = searchParams.get("file") ?? searchParams.get("page");

      if (!fileId && sabreFile) {
        const cfg = readSabreOfficeConfig();
        const parsed = cfg ? parseOfficeFileParam(sabreFile) : null;
        if (cfg && parsed) {
          const pathname = filesResourcePathname(cfg.base_uri, parsed.relUnderFiles);
          const name = parsed.relUnderFiles.split("/").pop() ?? "document";
          try {
            await server.openFromWebDav(pathname, {
              fileName: name,
              fileType: parsed.ext,
            });
          } catch (e) {
            console.error("Sabre WebDAV open failed", e);
          }
        }
      } else if (!fileId && newDoc) {
        server.openNew(newDoc);
      }

      if (disposed) {
        return;
      }

      const apiUrl = getAppRoot() + API_JS;
      const doc = server.getDocument();
      const user = server.getUser();
      const documentType = getDocumentType(doc.fileType);
      console.log("editor: ", doc, user, documentType);

      MockSocket.on("connect", server.handleConnect);
      MockSocket.on("disconnect", server.handleDisconnect);

      const onAppReady = () => {
        const iframe = document.querySelector<HTMLIFrameElement>(
          'iframe[name="frameEditor"]',
        );
        const win = iframe?.contentWindow as typeof window;
        const idoc = iframe?.contentDocument;
        if (!idoc || !win) {
          throw new Error("Iframe not loaded");
        }

        const XHR = createXHRProxy(win.XMLHttpRequest);
        const fetchProxy = createFetchProxy(win);
        const _Worker = win.Worker;

        XHR.use((request: Request) => {
          return server.handleRequest(request);
        });
        fetchProxy.use((request: Request) => {
          return server.handleRequest(request);
        });
        Object.assign(win, {
          io: io,
          XMLHttpRequest: XHR,
          fetch: fetchProxy,
          Worker: function (url: string, options?: WorkerOptions) {
            const u = new URL(url, location.origin);
            return new _Worker(
              u.href.replace(u.origin, location.origin),
              options,
            );
          },
        });

        // Upstream can emit "editor updated/version changed" warnings that trigger forced reload loops
        // in this embedded runtime where app/web-app asset versions may drift during rebuilds.
        const patchVersionReloadWarnings = () => {
          const w = win as typeof window & {
            Common?: {
              UI?: { warning?: (opts: unknown) => unknown };
              Gateway?: { updateVersion?: () => unknown };
            };
          };
          const common = w.Common;
          if (!common?.UI?.warning) return false;
          const originalWarning = common.UI.warning.bind(common.UI);
          common.UI.warning = (opts: unknown) => {
            const msg = String((opts as { msg?: unknown } | null)?.msg ?? "");
            if (
              msg.includes("editor version has been updated") ||
              msg.includes("file version has been changed")
            ) {
              return undefined;
            }
            return originalWarning(opts);
          };
          if (typeof common.Gateway?.updateVersion === "function") {
            common.Gateway.updateVersion = () => undefined;
          }
          return true;
        };
        if (!patchVersionReloadWarnings()) {
          let retries = 0;
          const t = window.setInterval(() => {
            retries += 1;
            if (patchVersionReloadWarnings() || retries > 20) {
              window.clearInterval(t);
            }
          }, 200);
        }

        const script = idoc.createElement("script");
        script.src = apiUrl;
        idoc.body.appendChild(script);
      };

      const createEditor = () => {
        server.setClient({
          buildVersion: window.DocsAPI!.DocEditor.version(),
        });
        const ed = new window.DocsAPI!.DocEditor("placeholder", {
          document: {
            fileType: doc.fileType,
            key: doc.key,
            title: doc.title,
            url: doc.url,

            permissions: {
              edit: doc.fileType != "pdf",
              chat: false,
              rename: true,
              protect: true,
              review: false,
              print: false,
            },
          },
          documentType: documentType,
          editorConfig: {
            mode: "edit",
            lang: language,
            coEditing: {
              mode: "fast",
              change: false,
            },
            user: {
              ...user,
            },

            customization: {
              uiTheme: theme,
              features: {
                spellcheck: {
                  change: false,
                },
              },
              logo: {
                image: location.origin + publicUrl("/logo-name_black.svg"),
                imageDark: location.origin + publicUrl("/logo-name_white.svg"),
                url: location.origin + publicUrl("/"),
              },
            },
          },
          events: {
            onAppReady: async (e: unknown) => {
              console.log("App ready", e, ed);
              onAppReady();
            },
            onDocumentReady: (e: unknown) => {
              console.log("Document ready", e);
              if (!disposed) {
                hideOnlyOfficeFileRibbon();
                window.setTimeout(() => {
                  if (!disposed) hideOnlyOfficeFileRibbon();
                }, 0);
                window.setTimeout(() => {
                  if (!disposed) hideOnlyOfficeFileRibbon();
                }, 150);
                window.setTimeout(() => {
                  if (!disposed) hideOnlyOfficeFileRibbon();
                }, 600);
              }
            },
            onDocumentStateChange: (e: { data: boolean; target: unknown }) => {
              console.log("Document state change", e);
              if (e.data) {
                isDirty.current = true;
              }
            },
            onRequestOpen: (e: unknown) => {
              console.log("onRequestOpen", e);
            },
            onError: (e: unknown) => {
              console.log("Error", e);
            },
            onInfo: (e: unknown) => {
              console.log("Info", e);
            },
            onWarning: (e: unknown) => {
              console.log("onWarning", e);
            },
            onRequestSaveAs: (e: unknown) => {
              console.log("onRequestSaveAs", e);
            },
            onSaveDocument: (e: unknown) => {
              console.log("onSaveDocument", e);
              isDirty.current = false;
            },
            onDownloadAs: (e: unknown) => {
              console.log("onDownloadAs", e);
            },
            onSave: (e: unknown) => {
              console.log("onSave", e);
              isDirty.current = false;
            },
            writeFile: async (e: unknown) => {
              console.log("writeFile", e);
              isDirty.current = false;
            },
          },
          type: "desktop",
          width: "100%",
          height: "100%",
        });
        Object.assign(window, {
          editor: ed,
        });
        editorRef.current = ed;
        return ed;
      };

      const loadEditor = () => {
        if (window.DocsAPI && window.DocsAPI.DocEditor) {
          createEditor();
        }
        let script = document.querySelector<HTMLScriptElement>(
          `script[src="${apiUrl}"]`,
        );
        if (!script) {
          script = document.createElement("script");
          script.src = apiUrl;
          document.head.appendChild(script);
        }
        script.onload = () => {
          createEditor();
        };
        script.onerror = (e) => {
          console.error("Failed to load DocsAPI script", e);
        };
      };

      loadEditor();
    };

    void boot();

    return () => {
      disposed = true;
      MockSocket.off("connect", server.handleConnect);
      MockSocket.off("disconnect", server.handleDisconnect);
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  return (
    <div>
      <div className="w-screen h-screen">
        <div id="placeholder">
          <iframe
            className="w-0 h-0 hidden"
            src={getAppRoot() + PRELOAD_HTML}
          ></iframe>
        </div>
      </div>
    </div>
  );
}

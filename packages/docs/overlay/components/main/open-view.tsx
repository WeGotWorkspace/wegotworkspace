"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Clock, X, Loader2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { getNewUrl } from "@/utils/editor/utils";
import { FilePickerCard } from "@/components/file-picker-card";
import { DocumentIcon } from "@/components/document-icon";
import { getDocConfig } from "@/lib/document-types";
import { useAppStore } from "@/store";
import {
  getRecentFiles,
  openRecentFile,
  removeRecentFile,
  addRecentFile,
  formatRelativeTime,
  type RecentFileRecord,
} from "@/utils/recent-files";
import { publicUrl } from "@/lib/public-url";
import { parseOfficeFileParam, readSabreOfficeConfig } from "@/lib/sabre-office-dav";

type Template = {
  name: string;
  filename: string;
  preview: string;
  type: string;
};

type OpenViewProps = {
  recommendedTemplates?: Template[];
};

export function OpenView({ recommendedTemplates }: OpenViewProps = {}) {
  const t = useExtracted();
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>(recommendedTemplates ?? []);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  const router = useRouter();
  const server = useAppStore((state) => state.server);
  const sabreFileRedirected = useRef(false);

  useEffect(() => {
    loadRecentFiles();
    if (!recommendedTemplates?.length) {
      loadTemplates();
    }
  }, []);

  /** Deep-link from file manager: `/office/?file=users/…/doc.docx` → editor (load + save via WebDAV). */
  useEffect(() => {
    if (!readSabreOfficeConfig() || sabreFileRedirected.current) {
      return;
    }
    const raw = new URLSearchParams(window.location.search).get("file");
    if (!raw || !parseOfficeFileParam(raw)) {
      return;
    }
    sabreFileRedirected.current = true;
    router.replace(`/editor?file=${encodeURIComponent(raw)}`);
  }, [router]);

  const loadRecentFiles = async () => {
    try {
      setIsLoading(true);
      const files = await getRecentFiles();
      setRecentFiles(files);
    } catch (error) {
      console.error("Failed to load recent files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch(publicUrl("/files/templates.json"));
      const data: Template[] = await res.json();
      setTemplates(data.slice(0, 5));
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const handleRecentFileClick = async (record: RecentFileRecord) => {
    try {
      const file = await openRecentFile(record);
      if (file) {
        await handleFileSelectWithHandle(file, record.handle);
      } else {
        await loadRecentFiles();
      }
    } catch (error) {
      console.error("Failed to open recent file:", error);
      await loadRecentFiles();
    }
  };

  const handleTemplateClick = async (tpl: Template) => {
    if (loadingTemplate) return;
    setLoadingTemplate(tpl.name);
    try {
      const url = publicUrl(`/files/${encodeURIComponent(tpl.filename)}`);
      await server.openUrl(url, { fileType: tpl.type, fileName: tpl.filename });
      router.push("/editor");
    } catch (err) {
      console.error("Failed to open template:", err);
    } finally {
      setLoadingTemplate(null);
    }
  };

  const handleRemoveRecentFile = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await removeRecentFile(id);
      await loadRecentFiles();
    } catch (error) {
      console.error("Failed to remove recent file:", error);
    }
  };

  const handleFileSelectWithHandle = async (
    file: File,
    handle?: FileSystemFileHandle,
  ) => {
    if (handle) {
      try {
        await addRecentFile(handle);
        await loadRecentFiles();
      } catch (error) {
        console.error("Failed to add to recent files:", error);
      }
    }

    await server.open(file);
    router.push("/editor");
  };

  const newDocTypes = [
    {
      type: "docx",
      label: t({ id: "Document", message: "Document" }),
    },
    {
      type: "xlsx",
      label: t({ id: "Spreadsheet", message: "Spreadsheet" }),
    },
    {
      type: "pptx",
      label: t({ id: "Presentation", message: "Presentation" }),
    },
    { type: "pdf", label: t({ id: "PDF", message: "PDF" }) },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <FilePickerCard onFileSelectWithHandle={handleFileSelectWithHandle} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("New")}</h2>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-nowrap items-stretch gap-3 mb-4">
          {newDocTypes.map(({ type, label }) => {
            const doc = getDocConfig(type);
            return (
              <Link
                key={type}
                href={getNewUrl(type)}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/40 dark:bg-white/5 border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all group overflow-hidden md:flex-1 md:min-w-0"
              >
                <DocumentIcon
                  type={type}
                  className={cn(
                    "transition-all duration-300",
                    doc.hoverBgColor,
                  )}
                  iconClassName="group-hover:text-white"
                />
                <span className="text-xs font-semibold transition-colors">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("Recommended")}</h2>
          <button
            onClick={() => router.push("/template")}
            className="text-xs text-primary font-medium hover:underline"
          >
            {t("More templates")}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {templates.map((tpl, i) => (
            <button
              key={i}
              className="flex flex-col gap-2 group text-left focus:outline-none"
              onClick={() => handleTemplateClick(tpl)}
              disabled={!!loadingTemplate}
            >
              <div
                className={cn(
                  "aspect-16/10 rounded-lg border border-border dark:border-white/5 shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all relative overflow-hidden bg-white dark:bg-zinc-900",
                )}
              >
                <img
                  src={publicUrl(`/files/${encodeURIComponent(tpl.preview)}`)}
                  alt={tpl.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />

                {loadingTemplate === tpl.name && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}

                <div
                  className={cn(
                    "absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase z-10",
                    getDocConfig(tpl.type).color,
                    "dark:text-white dark:bg-primary/80",
                    getDocConfig(tpl.type).lightBgColor,
                  )}
                >
                  {tpl.type}
                </div>
              </div>
              <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                {tpl.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("Recent")}</h2>
        </div>
        {isLoading ? (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">{t("Loading recent files...")}</p>
            </div>
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium mb-1">{t("No recent files")}</p>
              <p className="text-xs">
                {t("Files you open will appear here for quick access")}
              </p>
            </div>
          </div>
        ) : (
          <div className="">
            {recentFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleRecentFileClick(file)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-sidebar-hover border-b border-border last:border-0 transition-colors group"
                title={t("Click to reopen this file")}
              >
                <div className="flex items-center gap-4">
                  <DocumentIcon type={file.type} size="sm" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">{file.name}</p>
                    <p className="text-[10px] text-text-secondary">
                      {formatRelativeTime(file.updatedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveRecentFile(e, file.path)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-border/50 rounded"
                  title={t("Remove from recent")}
                >
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

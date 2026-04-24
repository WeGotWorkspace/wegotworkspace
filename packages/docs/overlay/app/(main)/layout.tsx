"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Header } from "@/components/main/header";
import { Sidebar } from "@/components/main/sidebar";
import { DragDropOverlay } from "@/components/drag-drop-overlay";
import { useAppStore } from "@/store";
import { addRecentFile } from "@/utils/recent-files";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/main/mobile-nav";
import { isDarkTheme } from "@/utils/utils";
import { getAppRoot, PRELOAD_HTML } from "@/utils/editor/utils";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { server, theme } = useAppStore();
  const [preloadEditor, setPreloadEditor] = useState(false);

  useEffect(() => {
    const isDark = isDarkTheme(theme);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    setPreloadEditor(true);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-screen overflow-hidden font-sans transition-colors duration-500 relative",
        "bg-muted text-slate-900 dark:bg-[#0b0b0b] dark:text-white",
      )}
    >
      <div className="hidden dark:block absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/6 rounded-full blur-[100px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary/3 rounded-full blur-[100px]"></div>
      </div>

      <Header></Header>
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row relative z-10">
        <div className="hidden md:flex">
          <Sidebar pathname={pathname} />
        </div>

        <main
          className={cn(
            "flex-1 md:mb-3 rounded-none md:rounded-2xl overflow-hidden flex flex-col transition-colors duration-500 shadow-none md:shadow-xl relative",
            "backdrop-blur-3xl bg-white dark:bg-[#141414]/60  dark:md:border dark:md:border-white/10",
          )}
        >
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-24 md:pb-8">
              {children}
            </div>
          </div>
        </main>
        <div className="hidden md:block w-3"></div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav pathname={pathname} />
      </div>

      <DragDropOverlay
        onFileDrop={async (file, handle) => {
          if (handle) {
            try {
              await addRecentFile(handle);
            } catch (err) {
              console.error("Failed to save dropped file to recent:", err);
            }
          }
          await server.open(file);
          router.push("/editor");
        }}
      />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }
      `}</style>

      {preloadEditor && (
        <iframe
          className="w-0 h-0 hidden absolute -z-10"
          src={getAppRoot() + PRELOAD_HTML}
        />
      )}
    </div>
  );
}

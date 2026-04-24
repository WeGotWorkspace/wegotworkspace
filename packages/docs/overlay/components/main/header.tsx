"use client";

import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileType2,
} from "lucide-react";
import { PropsWithChildren } from "react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { publicUrl } from "@/lib/public-url";

export function Header({ children }: PropsWithChildren<{}>) {
  const t = useExtracted();
  const quickActions = [
    {
      type: "docx",
      icon: FileText,
      color:
        "text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60",
    },
    {
      type: "xlsx",
      icon: FileSpreadsheet,
      color:
        "text-green-600 bg-green-50 dark:bg-green-900/40 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/60",
    },
    {
      type: "pptx",
      icon: Presentation,
      color:
        "text-orange-600 bg-orange-50 dark:bg-orange-900/40 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/60",
    },
    {
      type: "pdf",
      icon: FileType2,
      color:
        "text-red-600 bg-red-50 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60",
    },
  ];

  return (
    <header className="h-16 flex items-center justify-between px-6 z-20 w-full shrink-0">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Web Office home"
        >
          <img src={publicUrl("/logo.svg")} className="w-10 h-10" alt="logo" />
        </Link>
        <h1 className="text-lg font-bold tracking-normal text-foreground leading-5 pt-1 text-justify">
          {"Web Office"}
          <span className="block text-xs font-normal opacity-85 scale-[1] origin-top-left">
            Docs Sheets Slides
          </span>
        </h1>
      </div>

      {children}

      <div className="hidden md:flex items-center gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.type}
            href={`/editor?new=${action.type}`}
            className={cn(
              "p-2 rounded-lg transition-all duration-200 flex items-center justify-center",
              action.color,
            )}
            title={t("New {type}", { type: action.type })}
          >
            <action.icon className="w-5 h-5" />
          </Link>
        ))}
      </div>
    </header>
  );
}

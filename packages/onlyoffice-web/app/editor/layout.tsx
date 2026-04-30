import type { Metadata } from "next";
import { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "Document Editor",
  description:
    "Minimal local-first editor runtime for Word, Excel, and PowerPoint files.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: PropsWithChildren<unknown>) {
  return <>{children}</>;
}

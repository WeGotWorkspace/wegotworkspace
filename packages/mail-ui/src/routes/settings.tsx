import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsRedirectPage,
  head: () => ({
    meta: [
      { title: "Settings - Mail - WeGotWorkspace" },
      { name: "description", content: "Mail account settings open from the main mail view." },
    ],
  }),
});

function SettingsRedirectPage() {
  const settingsHref = (() => {
    if (typeof window === "undefined") return "/settings/mail/";
    const m = window.location.pathname.match(/^(.*)\/mail(?:\/.*)?$/);
    const base = m ? m[1] : "";
    const normalized = `${base}/settings/mail/`.replace(/\/+/g, "/");
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  })();

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to mail
      </Link>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground">
        Mail account credentials moved to User settings.
      </p>
      <a
        href={settingsHref}
        className="mt-5 inline-flex items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
      >
        Open User settings
      </a>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ServerCog,
  Database,
  Cloud,
  Mail as MailIcon,
  Phone,
  UserPlus,
  PartyPopper,
  CircleCheck,
  CircleAlert,
  CircleDashed,
  RefreshCw,
  Loader2,
  Lock,
} from "lucide-react";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/ui/button";
import { Switch } from "@/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import { SidebarGroup, SidebarLink } from "@/settings-sidebar/src/settings-sidebar";
import { Menu, X as XIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export const Route = createFileRoute("/install")({
  component: InstallWizard,
  head: () => ({
    meta: [
      { title: "Install" },
      { name: "description", content: "Set up your server." },
      { name: "theme-color", content: "#2f302c" },
    ],
  }),
});

const ACCENT = "#23b572";
const ACCENT_DEEP = "#23b572";
const INK = "#1a1a18";

function WgwLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 692 227" className={className} fill="none" aria-hidden="true">
      <path fill="#ffffff" d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893M173.103 20.406c5.147-.013 10.293-.013 15.44-.013 2.707 20.04 5.28 40.107 8.013 60.133 3.734-17 7.347-34.026 11.04-51.026q6.88-.04 13.76 0c3.68 17.04 7.32 34.066 11.04 51.093 2.72-20.053 5.294-40.133 8.014-60.187a1193 1193 0 0 1 15.44.014c-4.627 28.64-9.227 57.28-13.88 85.92-5.72.013-11.44.013-17.16.013-3.48-16.707-6.854-33.44-10.334-50.16C211.01 72.9 207.61 89.62 204.17 106.34c-5.734.026-11.467.026-17.187 0-4.64-28.64-9.28-57.28-13.88-85.934M259.943 20.406c13.253-.026 26.507-.013 39.76 0 .027 4.774.027 9.56 0 14.334-8.053.04-16.12 0-24.173.026a4089 4089 0 0 0 0 18.534c6.173.026 12.346-.014 18.52.013.026 4.827.026 9.653 0 14.467-6.174.026-12.347 0-18.52.026q-.021 12.08 0 24.16c8.466.054 16.933 0 25.413.04.013 4.774.013 9.547-.013 14.334-13.667.013-27.334.026-41 0 .013-28.64 0-57.294.013-85.934M325.583 27.5c7.92-8.907 22.147-10.294 32.467-5.04 8.24 4.453 11.52 14.026 12.92 22.72-4.8 1-9.6 1.973-14.4 2.906-1.067-4.226-1.907-8.933-5.28-12.026-4.04-3.747-11.04-2.654-14.2 1.706-4.627 6.347-5.014 14.6-5.387 22.16-.04 9.454-.187 19.694 4.853 28.054 2.934 5.04 10.44 6.72 15 2.933 4.307-3.627 4.814-9.64 5.254-14.867l-9.8-.04c-.04-4.333-.027-8.666 0-12.986 8.013-.027 16.026-.014 24.04-.014.013 14.454.013 28.894 0 43.347-3.734 0-7.467 0-11.2-.013-.347-2.48-.707-4.96-1.027-7.44-7.333 12.026-26.4 10.533-34.08-.32-8.387-11.387-9.32-26.28-8.947-39.934.534-10.893 2.334-22.666 9.787-31.146M406.41 20.86c7.693-2.307 16.706-1.734 23.146 3.466 7.467 5.92 10.067 15.92 10.134 25.067-.04 14.387-3.014 29.16-10.627 41.52-5.04 8.213-13.293 15.16-23.2 16.013-8.547 1.414-17.88-2.253-22.613-9.626-5.774-8.614-5.96-19.547-4.947-29.52 1.387-13 5.187-26.24 13.48-36.574 3.813-4.693 8.827-8.506 14.627-10.346m2.8 14.24c-5.72 3.32-8.614 9.72-10.854 15.64-3.333 9.813-5.293 20.32-4.293 30.693.493 4.787 2.853 10.573 8.2 11.387 5.827.626 10.493-3.934 13.147-8.64 5.306-9.387 7.56-20.227 8.28-30.907.2-5.693.16-12.107-3.654-16.733-2.64-3.187-7.373-3.267-10.826-1.44M442.45 20.406c15.973 0 31.933-.053 47.893.027 0 4.773 0 9.547-.013 14.32-5.4.013-10.8.013-16.2.013-.027 23.854.013 47.72-.014 71.574-5.16.013-10.293.026-15.44 0-.026-23.854 0-47.707-.013-71.56-5.4-.027-10.8-.027-16.2-.027-.027-4.787-.027-9.573-.013-14.347M173.103 120.18q7.72-.021 15.44 0c2.707 20.04 5.293 40.106 8 60.146 3.747-17 7.347-34.04 11.067-51.053 4.573-.04 9.16-.04 13.746.013 3.68 17.04 7.347 34.094 11.04 51.12 2.694-20.066 5.307-40.146 8-60.226 5.147-.014 10.294-.027 15.454 0-4.627 28.653-9.227 57.293-13.894 85.933-5.72.013-11.426.013-17.146.027-3.48-16.72-6.854-33.454-10.334-50.174-3.48 16.707-6.866 33.44-10.32 50.147-5.733.013-11.453.027-17.186-.013-4.627-28.64-9.267-57.28-13.867-85.92M283.783 120.74c8.347-2.68 18.373-1.72 24.88 4.573 8.147 7.773 9.373 19.92 8.507 30.56-1.227 15.307-5.56 31.44-16.667 42.627-8.893 9.146-24.973 11.8-35.213 3.386-8.24-6.906-10.227-18.466-9.68-28.68.733-15.373 4.68-31.44 14.88-43.373 3.573-4.093 8.133-7.347 13.293-9.093m5.44 13.306c-4.773 1.174-7.84 5.494-10.107 9.547-4.933 9.533-7.133 20.307-7.626 30.973-.08 5.44.16 11.654 4.12 15.84 3.893 3.974 10.52 2.134 13.866-1.653 5.88-6.347 8.4-14.96 10.267-23.213 1.493-8.2 2.893-16.934.36-25.067-1.227-4.573-6.133-8.187-10.88-6.427M324.356 120.18c11.694.666 23.907-1.787 35.187 2.146 13.36 5.04 17.36 23.16 10.24 34.72-2.253 3.974-5.88 6.854-9.613 9.347 5.746 13.253 11.573 26.467 17.32 39.72-5.48.013-10.947.013-16.427.013-5.44-12.44-10.787-24.906-16.24-37.333h-4.867c-.053 12.44 0 24.88-.026 37.32-5.2.027-10.4.027-15.587-.027.013-28.626-.013-57.266.013-85.906m15.587 14.373a5060 5060 0 0 0 0 19.867c5.307-.16 11.933 1.133 15.827-3.454 3.12-4.6 2.64-12.586-2.84-15.213-4.067-1.8-8.667-1.107-12.987-1.2M381.37 120.18c5.146-.014 10.293-.014 15.453 0 .04 10.746-.04 21.48.027 32.226 5.453-10.733 10.866-21.48 16.306-32.213 5.64-.04 11.28-.027 16.934-.013-6.427 12.826-12.947 25.6-19.374 38.426 7.094 15.84 14.24 31.654 21.334 47.507-5.507.027-11.014.013-16.507.027-6.307-13.747-12.413-27.56-18.693-41.307-.067 13.76.013 27.52-.04 41.28-5.16.027-10.307.027-15.454-.013 0-28.64-.013-57.28.014-85.92" />
      <path fill="#ffffff" d="M436.916 128.153c6.334-9.773 20.907-11.547 30.387-5.56 4.733 2.907 7.44 7.987 9.213 13.08-4.026 2.307-8.066 4.587-12.093 6.867-1.16-2.614-1.96-5.587-4.28-7.427-3.147-2.773-8.827-2.4-11.013 1.387-2.587 4.36-.454 9.933 3.346 12.826 8.44 7.107 19.654 12.014 24.294 22.707 3.706 9.067 3.053 20.72-3.987 28.04-7.32 7.64-19.573 8.76-29.053 4.907-8.574-3.587-13.227-12.587-14.6-21.374 4.306-2.386 8.64-4.746 12.96-7.12.826 5.44 2 11.8 7.146 14.84 4.8 3.094 12.427 1.094 13.814-4.813 1.973-6.12-2.2-11.893-6.88-15.387-6.52-4.946-14.347-8.693-18.787-15.893-4.96-7.987-5.573-19.013-.467-27.08M484.596 120.18c12.814.906 26.854-2.667 38.627 3.906 15.2 8.48 16.04 33.134 1.893 43-7.16 5.414-16.506 5.36-25.053 5.16-.04 11.28 0 22.574-.013 33.867-5.16.027-10.307.027-15.454 0-.04-28.64-.026-57.293 0-85.933m15.467 14.346c-.027 7.787-.027 15.574 0 23.347 5.76-.08 12.947.92 17.027-4.147 2.96-4.453 2.96-11.026-.24-15.346-4.187-4.747-11.134-3.747-16.787-3.854M552.343 120.18c5.387-.014 10.773-.014 16.173 0 7.64 28.64 15.254 57.28 22.84 85.946h-15.693c-1.653-6.826-3.267-13.666-4.92-20.493-6.867-.027-13.747-.013-20.613-.013-1.68 6.813-3.267 13.666-4.92 20.493-5.24.027-10.467.027-15.694 0 7.574-28.653 15.2-57.293 22.827-85.933m8.08 23.026c-2.267 9.334-4.52 18.68-6.72 28.027 4.48.027 8.973.027 13.467.013-2.227-9.346-4.454-18.706-6.747-28.04M602.943 124.846c8.387-7.053 21.413-7.44 30.587-1.693 7.626 5.12 10.146 14.653 11.16 23.28q-7.26 1.18-14.52 2.32c-1.094-4.56-1.427-9.893-5.027-13.307-4.653-3.666-12.173-1.826-14.987 3.28-4.586 8.014-4.44 17.654-4.533 26.614.32 7.653.36 15.826 4.16 22.706 2.933 5.44 11.267 6.307 15.453 1.867 3.094-3.24 3.867-7.84 4.96-12 4.76.88 9.534 1.787 14.294 2.72-1.467 7.067-3.387 14.573-8.68 19.84-7.08 6.947-18.374 8.16-27.467 4.987-8.787-3.254-13.947-12.054-16.2-20.72-2.827-11.107-3.093-22.8-1.627-34.12 1.454-9.507 4.814-19.44 12.427-25.774M650.463 120.18c13.253-.027 26.507-.014 39.76 0 .027 4.786.027 9.56 0 14.346-8.053.027-16.107-.013-24.16.014-.027 6.186-.027 12.36 0 18.546 6.16 0 12.333-.013 18.507 0q.039 7.24 0 14.48c-6.174 0-12.347-.013-18.507.027a3607 3607 0 0 0 0 24.173c8.453.027 16.92-.013 25.387.027.026 4.773.026 9.56 0 14.333-13.667.027-27.32.013-40.987 0-.027-28.64 0-57.28 0-85.933" />
    </svg>
  );
}

type StepId =
  | "welcome"
  | "server"
  | "database"
  | "dav"
  | "mail"
  | "meet"
  | "admin"
  | "done";

const STEPS: { id: StepId; label: string; icon: React.ReactNode }[] = [
  { id: "welcome", label: "Welcome", icon: <Sparkles className="size-3.5" /> },
  { id: "server", label: "Server check", icon: <ServerCog className="size-3.5" /> },
  { id: "database", label: "Database", icon: <Database className="size-3.5" /> },
  { id: "dav", label: "Files, Contacts & Calendars", icon: <Cloud className="size-3.5" /> },
  { id: "mail", label: "Mail server", icon: <MailIcon className="size-3.5" /> },
  { id: "meet", label: "Meet", icon: <Phone className="size-3.5" /> },
  { id: "admin", label: "Admin account", icon: <UserPlus className="size-3.5" /> },
  { id: "done", label: "Done", icon: <PartyPopper className="size-3.5" /> },
];

type CheckStatus = "ok" | "warn" | "error" | "pending";
type ServerCheck = { id: string; label: string; status: CheckStatus; detail: string };

const SEED_CHECKS: ServerCheck[] = [
  { id: "c1", label: "PHP version", status: "ok", detail: "8.3.4 detected" },
  { id: "c2", label: "Disk space", status: "ok", detail: "42.1 GB free of 100 GB" },
  { id: "c3", label: "Write permissions", status: "ok", detail: "wgw-content/ is writable" },
  { id: "c4", label: "Outbound network", status: "warn", detail: "High latency to update mirror (820 ms)" },
  { id: "c5", label: "Required extensions", status: "ok", detail: "openssl, mbstring, pdo, intl present" },
];

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Stockholm",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
];

function StatusDot({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, { color: string; Icon: typeof CircleCheck }> = {
    ok: { color: "#3a8f5a", Icon: CircleCheck },
    warn: { color: "#c98a1f", Icon: CircleAlert },
    error: { color: "#b14242", Icon: CircleAlert },
    pending: { color: "#7a7a78", Icon: CircleDashed },
  };
  const { color, Icon } = map[status];
  return <Icon className="size-4 shrink-0" style={{ color }} aria-hidden />;
}

function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border p-6 mb-6"
      style={{
        backgroundColor: "color-mix(in oklab, #1a1a18 3%, transparent)",
        borderColor: "color-mix(in oklab, #1a1a18 12%, transparent)",
      }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2
              className="text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
            >
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  readOnly,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-3 mb-7 last:mb-0">
      <Label
        className="text-xs uppercase tracking-wider font-medium flex items-center gap-1.5"
        style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}
      >
        {label}
        {readOnly && <Lock className="size-3 opacity-60" aria-hidden />}
      </Label>
      {children}
      {hint && (
        <p className="text-xs" style={{ color: "color-mix(in oklab, #1a1a18 50%, transparent)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function PrimaryButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      style={{ backgroundColor: ACCENT, color: "#ffffff", ...(props.style || {}) }}
    />
  );
}

function FeatureRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 border-t first:border-t-0"
      style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: INK }}>{label}</div>
        <div className="text-xs" style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}>{desc}</div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SecuritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = ["None", "STARTTLS", "SSL/TLS"];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InstallWizard() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const step = STEPS[stepIdx];

  const goToStep = (i: number) => {
    setStepIdx(i);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

  // ---- Step state ----
  const [checks, setChecks] = useState<ServerCheck[]>(SEED_CHECKS);
  const [checking, setChecking] = useState(false);

  const [dbType, setDbType] = useState<"sqlite" | "mysql">("sqlite");
  const [sqlitePath, setSqlitePath] = useState("wgw-content/db.sqlite");
  const [mysql, setMysql] = useState({
    host: "127.0.0.1",
    port: "3306",
    database: "wgw",
    username: "wgw",
    password: "",
  });

  const [dav, setDav] = useState({ files: true, contacts: true, calendars: false });

  const [mail, setMail] = useState({
    imapHost: "",
    imapPort: "993",
    imapSec: "SSL/TLS",
    smtpHost: "",
    smtpPort: "465",
    smtpSec: "SSL/TLS",
  });

  const [meet, setMeet] = useState({
    stun: "stun:stun.l.google.com:19302",
    turn: "",
    turnUser: "",
    turnPwd: "",
    forceRelay: false,
    tz: "UTC",
  });

  const [admin, setAdmin] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    password2: "",
  });

  const [installing, setInstalling] = useState(false);
  const [mysqlTest, setMysqlTest] = useState<{
    state: "idle" | "testing" | "ok" | "error";
    message?: string;
  }>({ state: "idle" });

  // Reset test when credentials change
  const updateMysql = (patch: Partial<typeof mysql>) => {
    setMysql({ ...mysql, ...patch });
    if (mysqlTest.state !== "idle") setMysqlTest({ state: "idle" });
  };

  const testMysql = (onSuccess?: () => void) => {
    setMysqlTest({ state: "testing" });
    setTimeout(() => {
      if (!mysql.password) {
        setMysqlTest({
          state: "error",
          message: "Access denied for user. Check your password and try again.",
        });
      } else {
        setMysqlTest({
          state: "ok",
          message: `Connected to ${mysql.database}@${mysql.host}:${mysql.port}`,
        });
        onSuccess?.();
      }
    }, 1000);
  };

  const refreshChecks = () => {
    setChecking(true);
    setChecks((arr) => arr.map((c) => ({ ...c, status: "pending" as CheckStatus })));
    setTimeout(() => {
      setChecks(SEED_CHECKS);
      setChecking(false);
    }, 700);
  };

  const canNext = (() => {
    switch (step.id) {
      case "database":
        return dbType === "sqlite"
          ? sqlitePath.trim().length > 0
          : mysql.host.trim() &&
              mysql.database.trim() &&
              mysql.username.trim() &&
              mysqlTest.state !== "testing";
      case "admin":
        return (
          admin.username.trim() &&
          admin.displayName.trim() &&
          /.+@.+\..+/.test(admin.email) &&
          admin.password.length >= 6 &&
          admin.password === admin.password2
        );
      default:
        return true;
    }
  })();

  const goNext = () => {
    if (!canNext) return;
    if (step.id === "database" && dbType === "mysql" && mysqlTest.state !== "ok") {
      testMysql(() => {
        setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
      });
      return;
    }
    if (step.id === "admin") {
      setInstalling(true);
      setTimeout(() => {
        setInstalling(false);
        setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
        toast("Installation complete", { icon: <Check className="size-4" /> });
      }, 1200);
      return;
    }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-dvh w-full overflow-hidden relative notes-root"
        style={{
          backgroundColor: "var(--color-cream, #f5f1e8)",
          fontFamily: "var(--font-sans)",
          ["--admin-sidebar" as string]: ACCENT_DEEP,
          ["--color-ink" as string]: "#000000",
          ["--sidebar-badge-fg" as string]: ACCENT_DEEP,
        }}
      >
        <aside
          data-open={sidebarOpen}
          className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[transform,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
            sidebarOpen
              ? "translate-x-0 w-72 md:w-72"
              : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
          }`}
          style={{
            backgroundColor: ACCENT_DEEP,
            borderColor: "color-mix(in oklab, #042318 18%, transparent)",
            color: "#042318",
          }}
        >
          <div className="p-6 md:p-8 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 227" className="w-auto shrink-0" style={{ height: "54px", marginTop: "-5px" }} fill="none" aria-hidden="true">
                <path fill="currentColor" d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893"/>
              </svg>
              <span
                className="flex flex-col items-start leading-[0.85] tracking-wide text-left uppercase text-3xl min-w-0"
                style={{ fontFamily: "var(--font-app)" }}
              >
                <span className="opacity-60">We got</span>
                <span>Workspace</span>
              </span>
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
              className="size-8 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,#042318_12%,transparent)] md:hidden shrink-0"
              style={{ color: "#042318" }}
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <SidebarGroup label="Setup steps">
              {STEPS.map((s, i) => {
                const done = i < stepIdx;
                const active = i === stepIdx;
                const reachable = i <= stepIdx;
                return (
                  <SidebarLink
                    key={s.id}
                    active={active}
                    onClick={reachable ? () => goToStep(i) : undefined}
                    icon={
                      <span
                        className="size-5 rounded-full flex items-center justify-center text-[10px] tabular-nums"
                        style={{
                          backgroundColor: done
                            ? "#042318"
                            : active
                              ? "color-mix(in oklab, #042318 22%, transparent)"
                              : "color-mix(in oklab, #042318 10%, transparent)",
                          color: done ? ACCENT_DEEP : "#042318",
                          fontWeight: 600,
                        }}
                      >
                        {done ? <Check className="size-3" /> : i + 1}
                      </span>
                    }
                  >
                    <span style={{ opacity: reachable ? 1 : 0.5 }}>{s.label}</span>
                  </SidebarLink>
                );
              })}
            </SidebarGroup>
          </nav>

          <div
            className="p-4 md:p-6 text-xs shrink-0 border-t"
            style={{
              borderColor: "color-mix(in oklab, #042318 22%, transparent)",
              color: "color-mix(in oklab, #042318 75%, transparent)",
            }}
          >
            Step {stepIdx + 1} of {STEPS.length}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <section
          className="flex-1 flex flex-col min-w-0 relative"
          style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
        >
          <header
            className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b shrink-0"
            style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
          >
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="size-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[color-mix(in_oklab,#1a1a18_12%,transparent)]"
                    style={{
                      color: "#1a1a18",
                      backgroundColor: "color-mix(in oklab, #1a1a18 6%, transparent)",
                    }}
                  >
                    <Menu className="size-4 md:hidden" />
                    {sidebarOpen ? (
                      <PanelLeftClose className="size-4 hidden md:block" />
                    ) : (
                      <PanelLeftOpen className="size-4 hidden md:block" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{sidebarOpen ? "Hide sidebar" : "Show sidebar"}</TooltipContent>
              </Tooltip>

              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] uppercase tracking-[0.2em] mb-1"
                  style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}
                >
                  Step {stepIdx + 1} / {STEPS.length} — {step.label}
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}
                >
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((stepIdx + 1) / STEPS.length) * 100}%`,
                      backgroundColor: ACCENT,
                    }}
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 md:px-12 py-10 md:py-16">
              <div className="mb-8">
                <div
                  className="text-[10px] uppercase tracking-[0.22em] mb-2 flex items-center gap-2"
                  style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)", fontFamily: "var(--font-mono)" }}
                >
                  {step.icon}
                  {step.label}
                </div>
                <h1
                  className="text-3xl md:text-4xl leading-tight"
                  style={{ fontFamily: "var(--font-serif)", color: INK }}
                >
                  {stepTitle(step.id)}
                </h1>
                <p className="mt-2 text-sm" style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}>
                  {stepSubtitle(step.id)}
                </p>
              </div>

              {step.id === "welcome" && <WelcomeStep />}

              {step.id === "server" && (
                <Card
                  title="System checks"
                  action={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Re-run checks"
                          onClick={refreshChecks}
                          disabled={checking}
                          className="size-8 rounded-md flex items-center justify-center hover:bg-[color-mix(in_oklab,#1a1a18_8%,transparent)]"
                        >
                          <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Re-run checks</TooltipContent>
                    </Tooltip>
                  }
                >
                  <ul className="divide-y" style={{ borderColor: "color-mix(in oklab, #1a1a18 10%, transparent)" }}>
                    {checks.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <StatusDot status={c.status} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: INK }}>{c.label}</div>
                          <div className="text-xs" style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}>
                            {c.status === "pending" ? "Checking…" : c.detail}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {step.id === "database" && (
                <>
                  <Card title="Database type">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["sqlite", "mysql"] as const).map((t) => {
                        const active = dbType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDbType(t)}
                            className="rounded-lg border p-4 text-left transition-colors"
                            style={{
                              borderColor: active
                                ? ACCENT
                                : "color-mix(in oklab, #1a1a18 12%, transparent)",
                              backgroundColor: active
                                ? "color-mix(in oklab, #2f302c 8%, transparent)"
                                : "transparent",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Database className="size-4" style={{ color: INK }} />
                              <div className="text-sm font-medium" style={{ color: INK }}>
                                {t === "sqlite" ? "SQLite" : "MySQL / MariaDB"}
                              </div>
                              {active && <Check className="size-4 ml-auto" style={{ color: ACCENT }} />}
                            </div>
                            <div className="text-xs mt-1" style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}>
                              {t === "sqlite"
                                ? "Single file, zero setup. Best for small installs."
                                : "Recommended for production and multi-user setups."}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  {dbType === "sqlite" ? (
                    <Card title="SQLite settings">
                      <Field label="Database file" hint="Path is relative to the install root.">
                        <Input
                          value={sqlitePath}
                          onChange={(e) => setSqlitePath(e.target.value)}
                          placeholder="wgw-content/db.sqlite"
                        />
                      </Field>
                    </Card>
                  ) : (
                    <Card title="MySQL credentials">
                      <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <Field label="Host">
                              <Input value={mysql.host} onChange={(e) => updateMysql({ host: e.target.value })} />
                            </Field>
                          </div>
                          <Field label="Port">
                            <Input value={mysql.port} onChange={(e) => updateMysql({ port: e.target.value })} />
                          </Field>
                        </div>
                        <Field label="Database name">
                          <Input value={mysql.database} onChange={(e) => updateMysql({ database: e.target.value })} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Username">
                            <Input value={mysql.username} onChange={(e) => updateMysql({ username: e.target.value })} />
                          </Field>
                          <Field label="Password">
                            <Input
                              type="password"
                              value={mysql.password}
                              onChange={(e) => updateMysql({ password: e.target.value })}
                              placeholder="••••••••"
                            />
                          </Field>
                        </div>
                      </div>

                      {mysqlTest.state === "error" && (
                        <div
                          className="mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
                          style={{
                            borderColor: "color-mix(in oklab, #b14242 35%, transparent)",
                            backgroundColor: "color-mix(in oklab, #b14242 8%, transparent)",
                            color: "#b14242",
                          }}
                        >
                          <CircleAlert className="size-4 shrink-0 mt-0.5" />
                          <span className="min-w-0">{mysqlTest.message}</span>
                        </div>
                      )}
                      {mysqlTest.state === "ok" && (
                        <div
                          className="mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
                          style={{
                            borderColor: "color-mix(in oklab, #3a8f5a 35%, transparent)",
                            backgroundColor: "color-mix(in oklab, #3a8f5a 8%, transparent)",
                            color: "#3a8f5a",
                          }}
                        >
                          <CircleCheck className="size-4 shrink-0 mt-0.5" />
                          <span className="min-w-0">{mysqlTest.message}</span>
                        </div>
                      )}
                    </Card>
                  )}
                </>
              )}

              {step.id === "dav" && (
                <>
                  <Card title="Files, Contacts & Calendars">
                    <FeatureRow label="Files" desc="Sync user files across devices." value={dav.files} onChange={(v) => setDav({ ...dav, files: v })} />
                    <FeatureRow label="Contacts" desc="Sync address books across devices." value={dav.contacts} onChange={(v) => setDav({ ...dav, contacts: v })} />
                    <FeatureRow label="Calendars" desc="Sync calendars and tasks across devices." value={dav.calendars} onChange={(v) => setDav({ ...dav, calendars: v })} />
                  </Card>
                  <Card title="Regional">
                    <Field label="Default timezone" hint="Used for calendar events and scheduled tasks.">
                      <Select value={meet.tz} onValueChange={(v) => setMeet({ ...meet, tz: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </Card>
                </>
              )}

              {step.id === "mail" && (
                <>
                  <Card title="IMAP (incoming)">
                    <Field label="Server">
                      <Input value={mail.imapHost} onChange={(e) => setMail({ ...mail, imapHost: e.target.value })} placeholder="imap.example.com" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Port">
                        <Input value={mail.imapPort} onChange={(e) => setMail({ ...mail, imapPort: e.target.value })} />
                      </Field>
                      <Field label="Security">
                        <SecuritySelect value={mail.imapSec} onChange={(v) => setMail({ ...mail, imapSec: v })} />
                      </Field>
                    </div>
                  </Card>
                  <Card title="SMTP (outgoing)">
                    <Field label="Server">
                      <Input value={mail.smtpHost} onChange={(e) => setMail({ ...mail, smtpHost: e.target.value })} placeholder="smtp.example.com" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Port">
                        <Input value={mail.smtpPort} onChange={(e) => setMail({ ...mail, smtpPort: e.target.value })} />
                      </Field>
                      <Field label="Security">
                        <SecuritySelect value={mail.smtpSec} onChange={(v) => setMail({ ...mail, smtpSec: v })} />
                      </Field>
                    </div>
                  </Card>
                </>
              )}

              {step.id === "meet" && (
                <>
                  <Card title="ICE servers">
                    <Field label="STUN URLs">
                      <Input value={meet.stun} onChange={(e) => setMeet({ ...meet, stun: e.target.value })} />
                    </Field>
                    <Field label="TURN URLs">
                      <Input value={meet.turn} onChange={(e) => setMeet({ ...meet, turn: e.target.value })} placeholder="turn:turn.example.com:3478" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="TURN username">
                        <Input value={meet.turnUser} onChange={(e) => setMeet({ ...meet, turnUser: e.target.value })} />
                      </Field>
                      <Field label="TURN password">
                        <Input
                          type="password"
                          value={meet.turnPwd}
                          onChange={(e) => setMeet({ ...meet, turnPwd: e.target.value })}
                          placeholder="••••••••"
                        />
                      </Field>
                    </div>
                  </Card>
                  <Card title="Routing">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: INK }}>
                          Force TURN relay for all calls
                        </div>
                        <div className="text-xs" style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}>
                          Routes every call through the TURN server. Off by default.
                        </div>
                      </div>
                      <Switch
                        checked={meet.forceRelay}
                        onCheckedChange={(v) => setMeet({ ...meet, forceRelay: v })}
                      />
                    </div>
                  </Card>

                </>
              )}

              {step.id === "admin" && (
                <Card title="Administrator account">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Username">
                      <Input
                        value={admin.username}
                        onChange={(e) => setAdmin({ ...admin, username: e.target.value })}
                        placeholder="admin"
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Display name">
                      <Input
                        value={admin.displayName}
                        onChange={(e) => setAdmin({ ...admin, displayName: e.target.value })}
                        placeholder="Jane Doe"
                      />
                    </Field>
                  </div>
                  <Field label="Email address">
                    <Input
                      type="email"
                      value={admin.email}
                      onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                      placeholder="admin@example.com"
                      autoComplete="off"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Password" hint="At least 6 characters.">
                      <Input
                        type="password"
                        value={admin.password}
                        onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label="Confirm password">
                      <Input
                        type="password"
                        value={admin.password2}
                        onChange={(e) => setAdmin({ ...admin, password2: e.target.value })}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </Field>
                  </div>
                  {admin.password && admin.password2 && admin.password !== admin.password2 && (
                    <p className="text-xs mt-1" style={{ color: "#b14242" }}>
                      Passwords do not match.
                    </p>
                  )}
                </Card>
              )}

              {step.id === "done" && <DoneStep onGo={() => navigate({ to: "/admin" })} />}

              {/* Footer nav */}
              {step.id !== "done" && (
                <div className="flex items-center justify-between mt-8">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    disabled={stepIdx === 0 || installing}
                    style={{ color: INK }}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Back
                  </Button>
                  <div className="flex items-center gap-2">
                    {(step.id === "mail" || step.id === "meet") && (
                      <Button
                        variant="ghost"
                        onClick={() => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1))}
                        disabled={installing}
                        style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}
                      >
                        Skip for now
                      </Button>
                    )}
                    <PrimaryButton
                      onClick={goNext}
                      disabled={!canNext || installing || mysqlTest.state === "testing"}
                    >
                      {installing ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Installing…
                        </>
                      ) : mysqlTest.state === "testing" ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Verifying connection…
                        </>
                      ) : step.id === "admin" ? (
                        <>
                          Finish install
                          <Check className="size-4 ml-1" />
                        </>
                      ) : step.id === "database" && dbType === "mysql" && mysqlTest.state !== "ok" ? (
                        <>
                          Verify connection &amp; continue
                          <ChevronRight className="size-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Continue
                          <ChevronRight className="size-4 ml-1" />
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}

function stepTitle(id: StepId) {
  switch (id) {
    case "welcome": return "Welcome";
    case "server": return "Check your server";
    case "database": return "Pick a database";
    case "dav": return "Enable Files, Contacts & Calendars";
    case "mail": return "Mail server";
    case "meet": return "Meet & voice";
    case "admin": return "Create admin account";
    case "done": return "All done!";
  }
}
function stepSubtitle(id: StepId) {
  switch (id) {
    case "welcome": return "A short, guided setup. Takes about a minute.";
    case "server": return "Make sure your environment meets the requirements.";
    case "database": return "Choose where your data will live.";
    case "dav": return "Toggle the sync features you want to enable.";
    case "mail": return "Server addresses only — accounts are configured per user later.";
    case "meet": return "ICE servers used for real-time voice and video calls.";
    case "admin": return "This account can manage everything in the server panel.";
    case "done": return "Your server is ready to go.";
  }
}

function WelcomeStep() {
  const items = [
    { label: "Server check", icon: <ServerCog className="size-4" /> },
    { label: "Database", icon: <Database className="size-4" /> },
    { label: "Files, Contacts & Calendars", icon: <Cloud className="size-4" /> },
    { label: "Mail server", icon: <MailIcon className="size-4" /> },
    { label: "Meet & voice", icon: <Phone className="size-4" /> },
    { label: "Admin account", icon: <UserPlus className="size-4" /> },
  ];
  return (
    <Card title="What you'll set up">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center gap-3 rounded-md px-3 py-2.5"
            style={{
              backgroundColor: "color-mix(in oklab, #1a1a18 4%, transparent)",
            }}
          >
            <span
              className="size-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: ACCENT, color: "#fff" }}
            >
              {it.icon}
            </span>
            <span className="text-sm font-medium" style={{ color: INK }}>{it.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs mt-4" style={{ color: "color-mix(in oklab, #1a1a18 55%, transparent)" }}>
        You can change any of these later from the admin panel.
      </p>
    </Card>
  );
}

function DoneStep({ onGo }: { onGo: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-6">
        <div
          className="size-16 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: "color-mix(in oklab, #3a8f5a 18%, transparent)" }}
        >
          <PartyPopper className="size-8" style={{ color: "#3a8f5a" }} />
        </div>
        <h2 className="text-2xl mb-2" style={{ fontFamily: "var(--font-serif)", color: INK }}>
          You're all set
        </h2>
        <p className="text-sm max-w-md mb-6" style={{ color: "color-mix(in oklab, #1a1a18 60%, transparent)" }}>
          Your server has been configured. You can sign in to the admin panel to manage users, mail, and more.
        </p>
        <PrimaryButton onClick={onGo}>
          Open admin panel
          <ChevronRight className="size-4 ml-1" />
        </PrimaryButton>
      </div>
    </Card>
  );
}

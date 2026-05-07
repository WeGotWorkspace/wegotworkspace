import type { Mail } from "@/types/mail";

export function parseMailTimestamp(value: string): number | null {
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

export function compareMailDesc(a: Mail, b: Mail): number {
  const da = parseMailTimestamp(a.date);
  const db = parseMailTimestamp(b.date);
  const aValid = da !== null;
  const bValid = db !== null;
  if (aValid && bValid && da !== db) return db - da;
  if (aValid && !bValid) return -1;
  if (!aValid && bValid) return 1;
  if (a.uid !== b.uid) return b.uid - a.uid;
  return b.id.localeCompare(a.id);
}

export function formatMailDateForList(raw: string): string {
  const ts = parseMailTimestamp(raw);
  if (ts === null) return raw;
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}

export function formatMailDateForDetail(raw: string): string {
  const ts = parseMailTimestamp(raw);
  if (ts === null) return raw;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

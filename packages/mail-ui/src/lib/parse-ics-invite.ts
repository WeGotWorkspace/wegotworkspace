import { format } from "date-fns";

/** First {@code BEGIN:VCALENDAR} … {@code END:VCALENDAR} block in a message body. */
export function extractVCalendarFromBody(body: string): { preamble: string; calendar: string | null } {
  const re = /BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/gi;
  const m = re.exec(body);
  if (!m || m.index === undefined) {
    return { preamble: body, calendar: null };
  }
  const calendar = m[0].trim();
  const preamble = `${body.slice(0, m.index)}${body.slice(m.index + m[0].length)}`.replace(/\n{3,}/g, "\n\n").trim();
  return { preamble, calendar };
}

function unescapeIcsValue(v: string): string {
  return v
    .replace(/\\N/gi, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";");
}

function unfoldIcs(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const acc: string[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    const c0 = line[0];
    if ((c0 === " " || c0 === "\t") && acc.length > 0) {
      acc[acc.length - 1] += line.slice(1);
    } else {
      acc.push(line);
    }
  }
  return acc.join("\n");
}

type PropEntry = { value: string; keyFull: string };

function parseCnFromKeyFull(keyFull: string): string | undefined {
  const segments = keyFull.split(";");
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const eq = seg.indexOf("=");
    if (eq === -1) continue;
    const k = seg.slice(0, eq).toUpperCase();
    if (k !== "CN") continue;
    let v = seg.slice(eq + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return unescapeIcsValue(v);
  }
  return undefined;
}

function parseIcsDateValue(value: string, keyFull: string): Date | undefined {
  const kf = keyFull.toUpperCase();
  const v = value.trim();
  const dateOnly = kf.includes("VALUE=DATE") && !kf.includes("DATE-TIME");
  if (dateOnly && /^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const mo = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    return new Date(y, mo, d);
  }
  const utc = v.endsWith("Z");
  const core = utc ? v.slice(0, -1) : v;
  const withTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(core);
  if (withTime) {
    const y = Number(withTime[1]);
    const mo = Number(withTime[2]) - 1;
    const day = Number(withTime[3]);
    const h = Number(withTime[4]);
    const mi = Number(withTime[5]);
    const s = Number(withTime[6]);
    if (utc) return new Date(Date.UTC(y, mo, day, h, mi, s));
    return new Date(y, mo, day, h, mi, s);
  }
  const dateOnlyVal = /^(\d{4})(\d{2})(\d{2})$/.exec(core);
  if (dateOnlyVal) {
    const y = Number(dateOnlyVal[1]);
    const mo = Number(dateOnlyVal[2]) - 1;
    const day = Number(dateOnlyVal[3]);
    return new Date(y, mo, day);
  }
  return undefined;
}

function organizerLabel(entry: PropEntry | undefined): string | undefined {
  if (!entry) return undefined;
  const cn = parseCnFromKeyFull(entry.keyFull);
  let addr = entry.value.trim();
  if (addr.toLowerCase().startsWith("mailto:")) {
    addr = addr.slice(7);
  }
  if (cn && cn !== addr) {
    return `${cn} <${addr}>`;
  }
  return addr || cn;
}

export type ParsedCalendarInvite = {
  method: string | undefined;
  summary: string | undefined;
  description: string | undefined;
  location: string | undefined;
  organizerLabel: string | undefined;
  status: string | undefined;
  dtStart: Date | undefined;
  dtEnd: Date | undefined;
  /** First {@code PARTSTAT} seen on an {@code ATTENDEE} line (often the mailbox owner on RSVP mail). */
  attendeePartstat: string | undefined;
};

export function parseCalendarInvite(icsRaw: string): ParsedCalendarInvite | null {
  if (!/BEGIN:VCALENDAR/i.test(icsRaw)) {
    return null;
  }
  const unfolded = unfoldIcs(icsRaw);
  const lines = unfolded.split("\n");

  let method: string | undefined;
  const byKey = new Map<string, PropEntry>();
  let attendeePartstat: string | undefined;
  let inEvent = false;
  let sawEvent = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.length === 0) continue;
    const up = line.toUpperCase();
    if (up === "BEGIN:VCALENDAR") continue;
    if (up === "END:VCALENDAR") break;
    if (up.startsWith("METHOD:") && !inEvent) {
      method = unescapeIcsValue(line.slice(7).trim());
      continue;
    }
    if (up === "BEGIN:VEVENT") {
      inEvent = true;
      sawEvent = true;
      continue;
    }
    if (up === "END:VEVENT") {
      break;
    }
    if (!inEvent) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const keyFull = line.slice(0, colon);
    const value = unescapeIcsValue(line.slice(colon + 1));
    const key = keyFull.split(";")[0]?.toUpperCase() ?? "";
    if (!key) continue;

    if (key === "ATTENDEE") {
      const m = /PARTSTAT=([^;:]+)/i.exec(keyFull);
      if (m && attendeePartstat === undefined) {
        attendeePartstat = m[1].trim().toUpperCase();
      }
      continue;
    }

    byKey.set(key, { value, keyFull });
  }

  if (!sawEvent) {
    return null;
  }

  const summary = byKey.get("SUMMARY")?.value;
  const description = byKey.get("DESCRIPTION")?.value;
  const location = byKey.get("LOCATION")?.value;
  const status = byKey.get("STATUS")?.value?.toUpperCase();
  const dtStartEntry = byKey.get("DTSTART");
  const dtEndEntry = byKey.get("DTEND");
  const dtStart = dtStartEntry ? parseIcsDateValue(dtStartEntry.value, dtStartEntry.keyFull) : undefined;
  const dtEnd = dtEndEntry ? parseIcsDateValue(dtEndEntry.value, dtEndEntry.keyFull) : undefined;

  return {
    method,
    summary,
    description,
    location,
    organizerLabel: organizerLabel(byKey.get("ORGANIZER")),
    status,
    dtStart,
    dtEnd,
    attendeePartstat,
  };
}

const METHOD_LABEL: Record<string, string> = {
  REQUEST: "Invitation",
  REPLY: "Calendar reply",
  PUBLISH: "Event update",
  CANCEL: "Cancellation",
  ADD: "Event added",
};

export function calendarMethodLabel(method: string | undefined): string {
  if (!method) return "Calendar";
  const u = method.trim().toUpperCase();
  return METHOD_LABEL[u] ?? `Calendar (${u})`;
}

export function formatCalendarRange(dtStart: Date | undefined, dtEnd: Date | undefined): string {
  if (!dtStart) {
    return "Time not specified";
  }
  if (!dtEnd || dtStart.getTime() === dtEnd.getTime()) {
    return format(dtStart, "EEEE, MMMM d, yyyy · p");
  }
  const sameCalendarDay =
    dtStart.getFullYear() === dtEnd.getFullYear() &&
    dtStart.getMonth() === dtEnd.getMonth() &&
    dtStart.getDate() === dtEnd.getDate();
  if (sameCalendarDay) {
    return `${format(dtStart, "EEEE, MMMM d, yyyy")} · ${format(dtStart, "p")} – ${format(dtEnd, "p")}`;
  }
  return `${format(dtStart, "PPP p")} → ${format(dtEnd, "PPP p")}`;
}

const PARTSTAT_LABEL: Record<string, string> = {
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  TENTATIVE: "Tentative",
  NEEDS_ACTION: "Pending",
  DELEGATED: "Delegated",
};

export function partstatLabel(partstat: string | undefined): string | undefined {
  if (!partstat) return undefined;
  return PARTSTAT_LABEL[partstat] ?? partstat.replaceAll("_", " ").toLowerCase();
}

import { Calendar, MapPin, StickyNote, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calendarMethodLabel,
  formatCalendarRange,
  partstatLabel,
  type ParsedCalendarInvite,
} from "@/lib/parse-ics-invite";

export function CalendarInviteCard({
  invite,
  rawIcs,
}: {
  invite: ParsedCalendarInvite;
  rawIcs: string;
}) {
  const title = invite.summary?.trim() || "Calendar event";
  const when = formatCalendarRange(invite.dtStart, invite.dtEnd);
  const methodBadge = calendarMethodLabel(invite.method);
  const rsvp = partstatLabel(invite.attendeePartstat);

  return (
    <Card className="mt-8 overflow-hidden border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/40 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {methodBadge}
          </span>
          {invite.status && (
            <span className="text-xs text-muted-foreground">· {invite.status.replaceAll("_", " ")}</span>
          )}
          {rsvp && (
            <span className="inline-flex items-center rounded-md bg-saffron/15 px-2 py-0.5 text-[11px] font-medium text-foreground">
              {rsvp}
            </span>
          )}
        </div>
        <CardTitle className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
        {invite.organizerLabel && (
          <CardDescription className="mt-2 flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="text-muted-foreground">Organizer</span>
            <span className="text-foreground">{invite.organizerLabel}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="flex gap-3">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">When</div>
            <div className="mt-0.5 text-sm text-foreground">{when}</div>
          </div>
        </div>
        {invite.location?.trim() && (
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Where</div>
              <div className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{invite.location.trim()}</div>
            </div>
          </div>
        )}
        {invite.description?.trim() && (
          <div className="flex gap-3">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
              <div className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">{invite.description.trim()}</div>
            </div>
          </div>
        )}
        <details className="rounded-md border border-dashed border-border bg-muted/20 text-sm">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground">
            Raw calendar (.ics)
          </summary>
          <pre className="max-h-48 overflow-auto border-t border-border p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {rawIcs}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}

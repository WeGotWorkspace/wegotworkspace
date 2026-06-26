import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/button/src/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { isValidShareEmail } from "@/lib/api/wgw/shares";
import { shareLabels } from "@/share-core/src/share-labels";
import { ShareFrame } from "@/share-core/src/share-frame";
import type { ShareAccessRequestStatus } from "@/share-core/src/share-types";
import type { WgwSharePublicMeta } from "@/lib/api/wgw/shares-types";
import "@/share-core/src/share-core.css";

export type ShareAccessRequestProps = {
  meta: WgwSharePublicMeta;
  status: ShareAccessRequestStatus;
  onRequestAccess: (email: string) => void;
};

export function ShareAccessRequest({ meta, status, onRequestAccess }: ShareAccessRequestProps) {
  const [email, setEmail] = useState("");
  const valid = isValidShareEmail(email);

  if (status === "sent") {
    return (
      <ShareFrame title={meta.name} centered>
        <div className="share-card">
          <MailCheck className="share-card__icon" aria-hidden="true" />
          <h2 className="share-card__title">{shareLabels.requestSentTitle}</h2>
          <p className="share-card__body">{shareLabels.requestSentBody}</p>
        </div>
      </ShareFrame>
    );
  }

  return (
    <ShareFrame title={meta.name} centered>
      <form
        className="share-card share-card--form"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onRequestAccess(email.trim());
        }}
      >
        <h2 className="share-card__title">{shareLabels.needsConfirmationTitle}</h2>
        <p className="share-card__body">{shareLabels.needsConfirmationBody}</p>
        <div className="share-card__field">
          <Label htmlFor="share-access-email">Email</Label>
          <Input
            id="share-access-email"
            type="email"
            autoComplete="email"
            placeholder={shareLabels.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={email.length > 0 && !valid}
          />
        </div>
        {status === "error" ? (
          <p className="share-card__error" role="alert">
            We couldn’t send the confirmation. Please try again.
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          label={shareLabels.requestAccess}
          disabled={!valid || status === "sending"}
        />
      </form>
    </ShareFrame>
  );
}

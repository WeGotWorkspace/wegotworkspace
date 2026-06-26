import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/button/src/button";
import { shareLabels } from "@/share-core/src/share-labels";
import { ShareFrame } from "@/share-core/src/share-frame";
import "@/share-core/src/share-core.css";

export function ShareLoadingScreen() {
  return (
    <ShareFrame centered>
      <div className="share-card" role="status" aria-live="polite">
        <Loader2 className="share-card__icon animate-spin" aria-hidden="true" />
        <p className="share-card__body">{shareLabels.loading}</p>
      </div>
    </ShareFrame>
  );
}

export function ShareConfirmingScreen() {
  return (
    <ShareFrame centered>
      <div className="share-card" role="status" aria-live="polite">
        <Loader2 className="share-card__icon animate-spin" aria-hidden="true" />
        <h2 className="share-card__title">{shareLabels.confirmingTitle}</h2>
      </div>
    </ShareFrame>
  );
}

export function ShareConfirmSuccessScreen({
  permission,
  onContinue,
}: {
  permission: "read" | "write";
  onContinue: () => void;
}) {
  return (
    <ShareFrame centered>
      <div className="share-card">
        <CheckCircle2 className="share-card__icon share-card__icon--success" aria-hidden="true" />
        <h2 className="share-card__title">{shareLabels.confirmSuccessTitle}</h2>
        <p className="share-card__body">
          {shareLabels.confirmSuccessBody}{" "}
          {permission === "write" ? "You can view and upload." : "You have view access."}
        </p>
        <Button variant="primary" label={shareLabels.continue} onClick={onContinue} />
      </div>
    </ShareFrame>
  );
}

export function ShareErrorScreen({
  message,
  title,
  onRetry,
}: {
  message: string;
  title?: string;
  onRetry: () => void;
}) {
  return (
    <ShareFrame centered>
      <div className="share-card">
        <AlertCircle className="share-card__icon share-card__icon--error" aria-hidden="true" />
        <h2 className="share-card__title">{title ?? shareLabels.errorTitle}</h2>
        <p className="share-card__body">{message}</p>
        <Button variant="outline" label={shareLabels.errorRetry} onClick={onRetry} />
      </div>
    </ShareFrame>
  );
}

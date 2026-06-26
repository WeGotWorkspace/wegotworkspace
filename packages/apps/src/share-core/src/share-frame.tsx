import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import { shareLabels } from "@/share-core/src/share-labels";
import "@/share-core/src/share-core.css";

export type ShareFrameProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Center the content vertically (used by the request / confirm screens). */
  centered?: boolean;
};

/** Public, shell-less chrome for the recipient viewer: a slim header plus content. */
export function ShareFrame({ title, subtitle, actions, children, centered }: ShareFrameProps) {
  return (
    <div className="share-frame">
      <header className="share-frame__header">
        <div className="share-frame__brand">
          <Share2 className="share-frame__brand-icon" aria-hidden="true" />
          <span className="share-frame__brand-text">{shareLabels.appName}</span>
        </div>
        <div className="share-frame__heading">
          {title ? <h1 className="share-frame__title">{title}</h1> : null}
          {subtitle ? <p className="share-frame__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="share-frame__actions">{actions}</div> : null}
      </header>
      <main
        className={centered ? "share-frame__main share-frame__main--centered" : "share-frame__main"}
      >
        {children}
      </main>
    </div>
  );
}

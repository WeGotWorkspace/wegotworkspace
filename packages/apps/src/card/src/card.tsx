import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import "./card.css";

export type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  iconActions?: CardIconAction[];
};

export type CardIconAction = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function CardIconActionButton({ icon, label, onClick, disabled }: CardIconAction) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className="card__icon-action"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Card({ title, children, className, action, iconActions }: CardProps) {
  return (
    <section className={cn("card", className)}>
      {(title || action || (iconActions && iconActions.length > 0)) && (
        <div className="card__header-row">
          {title ? <h2 className="card__title">{title}</h2> : <span />}
          {iconActions && iconActions.length > 0 ? (
            <div className="card__icon-actions">
              {iconActions.map((iconAction) => (
                <CardIconActionButton key={iconAction.label} {...iconAction} />
              ))}
            </div>
          ) : (
            action
          )}
        </div>
      )}
      {children}
    </section>
  );
}

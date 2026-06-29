import type { ReactNode } from "react";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { formatRelativeTimestamp } from "../docs-comments/docs-comments-utils";

export type DocsCollabCardHeaderProps = {
  authorName: string;
  createdAt: string;
  actions: ReactNode;
};

export function DocsCollabCardHeader({
  authorName,
  createdAt,
  actions,
}: DocsCollabCardHeaderProps) {
  return (
    <div className="docs-collab-card__header">
      <div className="docs-collab-card__author-row">
        <UserAvatar
          displayName={authorName}
          compact
          size="sm"
          className="docs-collab-card__avatar"
        />
        <div className="docs-collab-card__meta">
          <p className="docs-collab-card__author">{authorName}</p>
          <time className="docs-collab-card__time" dateTime={createdAt}>
            {formatRelativeTimestamp(createdAt)}
          </time>
        </div>
      </div>
      <div className="docs-collab-card__actions">{actions}</div>
    </div>
  );
}

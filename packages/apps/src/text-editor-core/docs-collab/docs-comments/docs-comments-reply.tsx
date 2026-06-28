import { UserAvatar } from "@/user-avatar/src/user-avatar";
import type { DocsCommentMessage } from "../docs-comments-types";
import { formatRelativeTimestamp } from "./docs-comments-utils";

import "./docs-comments-reply.css";

export type DocsCommentsReplyProps = {
  message: DocsCommentMessage;
};

export function DocsCommentsReply({ message }: DocsCommentsReplyProps) {
  return (
    <div className="docs-comments-reply">
      <UserAvatar
        displayName={message.author.name}
        compact
        size="sm"
        className="docs-comments-reply__avatar"
      />
      <div className="docs-comments-reply__content">
        <div className="docs-comments-reply__header">
          <span className="docs-comments-reply__author">{message.author.name}</span>
          <time className="docs-comments-reply__time" dateTime={message.createdAt}>
            {formatRelativeTimestamp(message.createdAt)}
          </time>
        </div>
        <p className="docs-comments-reply__body">{message.body}</p>
      </div>
    </div>
  );
}

import type { ComponentProps } from "react";

import { UserAvatar } from "@/user-avatar/src/user-avatar";

import type { ContactCard } from "./contacts-types";
import { contactDisplayName } from "./contacts-display-utils";
import { useContactPhotoSrc } from "./use-contact-photo-src";

type ContactUserAvatarProps = Omit<
  ComponentProps<typeof UserAvatar>,
  "displayName" | "imageSrc"
> & {
  card?: ContactCard;
  /** Used when `card` is omitted (e.g. create mode). */
  displayName?: string;
};

/** Contact list/detail avatar — loads blob-backed photos with API auth. */
export function ContactUserAvatar({ card, displayName, ...props }: ContactUserAvatarProps) {
  const imageSrc = useContactPhotoSrc(card);
  const resolvedName = card ? contactDisplayName(card) : displayName?.trim() || "?";

  return <UserAvatar displayName={resolvedName} imageSrc={imageSrc} {...props} />;
}

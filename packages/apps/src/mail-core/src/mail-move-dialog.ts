import type { Mail } from "@/types/mail";

export function buildMoveMailboxOptions(
  allSystemMailboxes: readonly string[],
  moreMailboxes: readonly string[],
): string[] {
  return Array.from(new Set(["Inbox", ...allSystemMailboxes, ...moreMailboxes]));
}

export function resolveMoveMailboxOption(
  row: Mail | undefined,
  moveMailboxOptions: readonly string[],
  encodeFolderToken: (label: string) => string,
): string | undefined {
  if (!row) return undefined;
  const byLabel = moveMailboxOptions.find(
    (option) => option.toLowerCase() === row.mailbox.toLowerCase(),
  );
  if (byLabel) return byLabel;
  return moveMailboxOptions.find((option) => encodeFolderToken(option) === row.folder);
}

export function resolveMoveDialogCurrentMailbox(args: {
  moveDialog: { ids: string[]; currentMailbox?: string } | null;
  view: string;
  mail: Mail[];
  moveMailboxOptions: readonly string[];
  encodeFolderToken: (label: string) => string;
}): string | undefined {
  const { moveDialog, view, mail, moveMailboxOptions, encodeFolderToken } = args;
  if (!moveDialog || moveDialog.ids.length === 0) return undefined;

  if (view.startsWith("mb:")) {
    const currentViewMailbox = view.slice(3).trim();
    const byView = moveMailboxOptions.find(
      (option) => option.trim().toLowerCase() === currentViewMailbox.toLowerCase(),
    );
    if (byView) return byView;
  }

  if (moveDialog.currentMailbox) {
    const byDialogMailbox = moveMailboxOptions.find(
      (option) => option.trim().toLowerCase() === moveDialog.currentMailbox?.trim().toLowerCase(),
    );
    if (byDialogMailbox) return byDialogMailbox;
  }

  const selectedMailboxes = new Set(
    moveDialog.ids.map((id) =>
      resolveMoveMailboxOption(
        mail.find((m) => m.id === id),
        moveMailboxOptions,
        encodeFolderToken,
      ),
    ),
  );
  selectedMailboxes.delete(undefined);
  if (selectedMailboxes.size === 1) return Array.from(selectedMailboxes)[0];
  return undefined;
}

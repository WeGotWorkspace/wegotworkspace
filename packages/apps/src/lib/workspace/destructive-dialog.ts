export type WorkspaceDestructiveDialogLabels = {
  dialogCancel: string;
  dialogDelete: string;
  dialogDeleteConfirmSuffix: string;
  dialogPermanentDeleteLeadIn: string;
};

export const workspaceDestructiveDialogLabels: WorkspaceDestructiveDialogLabels = {
  dialogCancel: "Cancel",
  dialogDelete: "Delete",
  dialogDeleteConfirmSuffix: "This action cannot be undone.",
  dialogPermanentDeleteLeadIn: "This will permanently delete ",
};

export function buildPermanentDeleteDescription({
  leadIn,
  target,
  suffix,
}: {
  leadIn: string;
  target: string;
  suffix: string;
}) {
  return `${leadIn}${target}. ${suffix}`;
}

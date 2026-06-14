import { Check, Pencil, Trash2, X } from "lucide-react";
import { ActionBar } from "@/action-bar/src/action-bar";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

type ContactsDetailActionBarProps = {
  labels: ContactsUILabels;
  canEdit: boolean;
  editMode: boolean;
  createMode: boolean;
  closeMobileDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export function ContactsDetailActionBar({
  labels,
  canEdit,
  editMode,
  createMode,
  closeMobileDetail,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: ContactsDetailActionBarProps) {
  if (createMode || editMode) {
    return (
      <ActionBar
        onBack={closeMobileDetail}
        rightActions={[
          {
            id: "cancel",
            label: labels.cancel,
            onClick: onCancel,
            icon: <X className="size-4" />,
          },
          {
            id: "save",
            label: labels.save,
            onClick: onSave,
            icon: <Check className="size-4" />,
          },
        ]}
      />
    );
  }

  const rightActions = [
    ...(canEdit
      ? [
          {
            id: "edit",
            label: labels.edit,
            onClick: onEdit,
            icon: <Pencil className="size-4" />,
          },
        ]
      : []),
    {
      id: "delete",
      label: labels.delete,
      onClick: onDelete,
      icon: <Trash2 className="size-4" />,
    },
  ];

  return (
    <ActionBar
      onBack={closeMobileDetail}
      rightActions={rightActions}
      rightMenuLabel="More actions"
    />
  );
}

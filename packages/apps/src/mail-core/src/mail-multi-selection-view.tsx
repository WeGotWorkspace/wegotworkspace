import {
  MultiSelectionView,
  type MultiSelectionViewAction,
} from "@/multi-selection-view/src/multi-selection-view";
import type { Mail } from "@/types/mail";

type MailMultiSelectionAction = MultiSelectionViewAction;

type MailMultiSelectionViewProps = {
  selected: Mail[];
  actions?: MailMultiSelectionAction[];
  className?: string;
  label?: string;
  title?: (count: number) => string;
};

export function MailMultiSelectionView({
  selected,
  actions = [],
  className,
  label = "Multiple selection",
  title = (count) => `${count} ${count === 1 ? "message" : "messages"} selected`,
}: MailMultiSelectionViewProps) {
  return (
    <MultiSelectionView
      count={selected.length}
      actions={actions}
      className={className}
      label={label}
      title={title}
    />
  );
}
